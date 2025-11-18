// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ReflexProofCertificate
 * @dev Soulbound token used as immutable certificate for validated reflex results.
 */
contract ReflexProofCertificate is ERC721, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    uint256 private _nextId = 1;

    mapping(uint256 tokenId => string) private _tokenURI;

    constructor() ERC721("ReflexProof Certificate", "RP-CERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl, ERC721) returns (bool) {
        return ERC721.supportsInterface(interfaceId) || AccessControl.supportsInterface(interfaceId);
    }

    function issue(
        address to,
        string calldata certCID
    ) external onlyRole(ISSUER_ROLE) returns (uint256 tokenId) {
        tokenId = _nextId++;
        _safeMint(to, tokenId);
        _tokenURI[tokenId] = certCID;
    }

    function burn(uint256 tokenId) external onlyRole(ISSUER_ROLE) {
        _burn(tokenId);
        delete _tokenURI[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ReflexProofCertificate: invalid token");
        return _tokenURI[tokenId];
    }

    // ------------------------------------------------------------------------
    // Soulbound enforcement
    // ------------------------------------------------------------------------
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        if (previousOwner != address(0) && to != address(0)) {
            revert("ReflexProofCertificate: non-transferable");
        }
        return previousOwner;
    }
}

/**
 * @title ReflexProof
 * @notice FHE-enabled reflex speed attestation registry with public / encrypted visibility modes.
 */
contract ReflexProof is ZamaEthereumConfig, AccessControl {
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum Visibility {
        Private,
        Encrypted,
        Public
    }

    struct ResultInternal {
        address player;
        uint8 mode;
        string resultCID;
        bytes32 resultHash;
        uint8 visibility;
        uint64 valueMs;
        uint64 submittedAt;
        uint256 eventId;
        euint64 encryptedValue;
        bytes32 deviceHash;
        uint64 rounds;
        bool verified;
        uint256 certificateTokenId;
    }

    struct ResultView {
        uint256 resultId;
        address player;
        uint8 mode;
        string resultCID;
        bytes32 resultHash;
        uint8 visibility;
        uint64 valueMs;
        uint256 eventId;
        uint64 submittedAt;
        bytes32 deviceHash;
        uint64 rounds;
        bool verified;
        uint256 certificateTokenId;
    }

    struct ReflexEvent {
        uint256 eventId;
        address organizer;
        string eventCID;
        uint64 startTime;
        uint64 endTime;
        bytes32 rulesHash;
    }

    struct SubmitParams {
        bytes32 resultHash;
        string resultCID;
        uint64 valueMs;
        uint8 mode;
        uint8 visibility;
        uint256 eventId;
        bytes32 deviceHash;
        uint64 rounds;
        externalEuint64 encryptedValue;
        bytes encryptedProof;
    }

    event ResultSubmitted(
        uint256 indexed resultId,
        address indexed player,
        bytes32 resultHash,
        uint8 visibility,
        uint256 indexed eventId,
        uint64 timestamp
    );

    event EventCreated(uint256 indexed eventId, address indexed organizer, string eventCID);
    event ResultVerified(uint256 indexed resultId, address indexed verifier, bool approved, string verifyCID);
    event CertificateMinted(uint256 indexed resultId, uint256 indexed tokenId, address indexed to);
    event DecryptPermissionGranted(uint256 indexed resultId, address indexed to);
    event ResultRevealed(uint256 indexed resultId, uint64 valueMs, string plainCID);

    uint256 private _resultCounter = 0;
    uint256 private _eventCounter = 0;

    mapping(uint256 resultId => ResultInternal) private _results;
    mapping(uint256 eventId => ReflexEvent) private _events;

    ReflexProofCertificate public immutable certificate;

    constructor(address admin) {
        require(admin != address(0), "ReflexProof: admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        certificate = new ReflexProofCertificate();
        certificate.grantRole(certificate.DEFAULT_ADMIN_ROLE(), admin);
        certificate.grantRole(certificate.ISSUER_ROLE(), address(this));
    }

    // ------------------------------------------------------------------------
    // Result submission
    // ------------------------------------------------------------------------
    function submitResult(SubmitParams calldata params) external returns (uint256 resultId) {
        require(params.resultHash != bytes32(0), "ReflexProof: result hash required");
        require(params.rounds > 0, "ReflexProof: rounds missing");
        require(params.mode > 0, "ReflexProof: mode missing");
        require(params.visibility <= uint8(Visibility.Public), "ReflexProof: invalid visibility");
        if (params.visibility == uint8(Visibility.Public)) {
            require(params.valueMs > 0, "ReflexProof: public value missing");
        }

        euint64 encryptedValue = FHE.fromExternal(params.encryptedValue, params.encryptedProof);

        resultId = ++_resultCounter;
        ResultInternal storage stored = _results[resultId];
        stored.player = msg.sender;
        stored.mode = params.mode;
        stored.resultCID = params.resultCID;
        stored.resultHash = params.resultHash;
        stored.visibility = params.visibility;
        stored.valueMs = params.visibility == uint8(Visibility.Public) ? params.valueMs : 0;
        stored.eventId = params.eventId;
        stored.encryptedValue = encryptedValue;
        stored.submittedAt = uint64(block.timestamp);
        stored.deviceHash = params.deviceHash;
        stored.rounds = params.rounds;

        // Self and contract can decrypt
        FHE.allow(stored.encryptedValue, address(this));
        FHE.allow(stored.encryptedValue, msg.sender);

        emit ResultSubmitted(
            resultId,
            msg.sender,
            params.resultHash,
            params.visibility,
            params.eventId,
            stored.submittedAt
        );
    }

    function getResult(uint256 resultId) external view returns (ResultView memory viewResult) {
        ResultInternal storage stored = _results[resultId];
        require(stored.player != address(0), "ReflexProof: result not found");

        viewResult = ResultView({
            resultId: resultId,
            player: stored.player,
            mode: stored.mode,
            resultCID: stored.resultCID,
            resultHash: stored.resultHash,
            visibility: stored.visibility,
            valueMs: stored.valueMs,
            eventId: stored.eventId,
            submittedAt: stored.submittedAt,
            deviceHash: stored.deviceHash,
            rounds: stored.rounds,
            verified: stored.verified,
            certificateTokenId: stored.certificateTokenId
        });
    }

    function getEncryptedValue(uint256 resultId) external view returns (euint64) {
        ResultInternal storage stored = _results[resultId];
        require(stored.player != address(0), "ReflexProof: result not found");
        return stored.encryptedValue;
    }

    function grantDecrypt(uint256 resultId, address to) external {
        ResultInternal storage stored = _results[resultId];
        require(stored.player != address(0), "ReflexProof: result not found");
        require(stored.player == msg.sender || hasRole(ORGANIZER_ROLE, msg.sender), "ReflexProof: not authorized");
        FHE.allow(stored.encryptedValue, to);
        emit DecryptPermissionGranted(resultId, to);
    }

    function revealResult(uint256 resultId, uint64 valueMs, string calldata plainCID) external {
        ResultInternal storage stored = _results[resultId];
        require(stored.player != address(0), "ReflexProof: result not found");
        require(stored.player == msg.sender, "ReflexProof: not result owner");
        require(valueMs > 0, "ReflexProof: invalid value");

        stored.visibility = uint8(Visibility.Public);
        stored.valueMs = valueMs;
        stored.resultCID = plainCID;

        emit ResultRevealed(resultId, valueMs, plainCID);
    }

    function totalResults() external view returns (uint256) {
        return _resultCounter;
    }

    function totalEvents() external view returns (uint256) {
        return _eventCounter;
    }

    function certificateAddress() external view returns (address) {
        return address(certificate);
    }

    // ------------------------------------------------------------------------
    // Event lifecycle
    // ------------------------------------------------------------------------
    function createEvent(
        string calldata eventCID,
        uint64 startTime,
        uint64 endTime,
        bytes32 rulesHash
    ) external onlyRole(ORGANIZER_ROLE) returns (uint256 eventId) {
        require(endTime == 0 || endTime > startTime, "ReflexProof: invalid window");

        eventId = ++_eventCounter;
        _events[eventId] = ReflexEvent({
            eventId: eventId,
            organizer: msg.sender,
            eventCID: eventCID,
            startTime: startTime,
            endTime: endTime,
            rulesHash: rulesHash
        });

        emit EventCreated(eventId, msg.sender, eventCID);
    }

    function getEvent(uint256 eventId) external view returns (ReflexEvent memory) {
        ReflexEvent memory ev = _events[eventId];
        require(ev.organizer != address(0), "ReflexProof: event not found");
        return ev;
    }

    // ------------------------------------------------------------------------
    // Verification & certificates
    // ------------------------------------------------------------------------
    function verifyResult(
        uint256 resultId,
        bool approved,
        string calldata verifyCID
    ) external onlyRole(VERIFIER_ROLE) {
        ResultInternal storage stored = _results[resultId];
        require(stored.player != address(0), "ReflexProof: result not found");

        stored.verified = approved;
        emit ResultVerified(resultId, msg.sender, approved, verifyCID);
    }

    function awardCertificate(
        uint256 resultId,
        address to,
        string calldata certCID
    ) external onlyRole(ORGANIZER_ROLE) returns (uint256 tokenId) {
        ResultInternal storage stored = _results[resultId];
        require(stored.player != address(0), "ReflexProof: result not found");
        require(stored.certificateTokenId == 0, "ReflexProof: certificate exists");

        tokenId = certificate.issue(to, certCID);
        stored.certificateTokenId = tokenId;
        emit CertificateMinted(resultId, tokenId, to);
    }
}

