// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

//imports to get the ERC721 contract
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//import to manipulate strings
import "@openzeppelin/contracts/utils/Strings.sol";
//import to base64 encode the image
import 'base64-sol/base64.sol';
//imports to interact with the chainlink oracle
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

  //Chainlink VRF v2 offers two methods for requesting randomness: Subscription and direct funding.
  
  //In this smart contract, the subscription method is used. Check out https://docs.chain.link/docs/vrf/v2/subscription/ for more details.
  
  //Under the susbcription method, create a subscription account and fund its balance with LINK tokens. 
  //Users can then connect multiple consuming contracts to the subscription account. 
  
  //When the consuming contracts request randomness, the transaction costs are calculated after the 
  //randomness requests are fulfilled and the subscription balance is deducted accordingly. 
  
  //The subscription method allows you to fund requests for multiple consumer contracts from a single subscription.
  
  //If the use case requires regular requests for randomness, the subscription method is recommended in order
  //to simplify funding and reduce the overall cost.
  //The direct funding method is more suitable for infrequent one-off requests.

//import to handle hex strings
import './HexStrings.sol';

//error definitions for the contract. Using this instead of required() to save gas
error NotEnoughLink();
error NotCorrectBetAmount();
error NotEnoughEtherSent();
error CanNotMintMore();
error CanNotMintOne();
error TokenDoesNotExist();
error CanNotWithdraw();

contract YourContract is VRFConsumerBaseV2,ERC721Enumerable, Ownable {

  //setting up libraries to use in the contract for specific types
  using Strings for uint256;
  using HexStrings for uint160;
  using Counters for Counters.Counter;
  //setting the counter for the token ids private
  Counters.Counter private _tokenIds;
  //setting the chainlink oracle interface to use in the contract 
  VRFCoordinatorV2Interface COORDINATOR;
  //initializing the chainlink oracle subscription id
  uint64 s_subscriptionId;
  //Goerli address for the chainlink oracle
  address vrfCoordinator = 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D; 
  //Gas lane for the goerli chainlink oracle
  bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;
  //call back gas limit for when the oracle returns the random number - currently set to maximum  
  uint32 callbackGasLimit = 2500000; 
  //number of confirmations required for the oracle to return the random number
  uint16 requestConfirmations = 3;
  //amount of random numbers to be delivered by the oracle
  uint32 numWords =  6;
  //instantiating the variable for the request id
  uint256 public s_requestId;


  //instantiating mappings required to handle the random number request and fulfilment for each bet of each player as per bet id
  mapping(uint=>uint) public randomnumber;
  mapping(uint=>uint) public reverseID;
  mapping(uint=>address) public reverseAD;
  mapping(address=>uint) public guess;

  //instantiating the mapping to allow a player to mint a nft when a prime number is randomly generated
  mapping(address=>bool) public canmintnft;

  //instantiating mappings to store the random numbers that will be used to determine tbe characteristics of the nft (color, shape and speed)
  mapping(uint=>uint) public colormappingone;
  mapping(uint=>uint) public colormappingtwo;
  mapping(uint=>uint) public colormappingthree;
  mapping(uint=>uint) public colormappingfour;
  mapping(uint=>uint) public colormappingfive;
  mapping(uint=>uint) public colormappingsix;

  constructor() VRFConsumerBaseV2(vrfCoordinator) ERC721("Prime","PRIME"){
    //defining a constructor that takes in the address of the Chainlink oracle contract.
    COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
    //defining the subscription id for the chainlink oracle
    s_subscriptionId = 2017;
    //canmintnft[0x8f9b1b9EAabE5A1CAd1C432Cb9AE03B9840661de] = true;
    

  }
  
  //instantiating the variable for the current bet id
  uint public betid; 

  //instantiating the bet event to be emitted when a bet is placed
  event Guesses(address indexed guesser, uint  theguess,uint guessid,uint  randomnumber,string  guessmatch,uint  payout,uint betid);


  
  //function to retrieve the current LINK balance of the subscrition id
  function getsubbalance() public view returns (uint96){
    (uint96 balance1, , , ) = COORDINATOR.getSubscription(s_subscriptionId);
    return balance1;
  }
  


//defining a requestRandomWords function that takes in a uint guess.
  function requestRandomWords(uint _guess) public payable {

    //only allow request if there the available LINK is greater than 4 LINK. Since the fulfilment action occurs approximately 60 seconds after the request.
    if (getsubbalance() < 4) {
      revert NotEnoughLink();
    }

    //ensure that the minimum bet amount is 0.001 ETH.
    if (msg.value != 0.001 ether) {
      revert NotCorrectBetAmount();
    }

    //calling the requestRandomWords function through the coordinator
    //storing the request ID in a variable.
    s_requestId = COORDINATOR.requestRandomWords(
      keyHash,
      s_subscriptionId,
      requestConfirmations,
      callbackGasLimit,
      numWords
    );

    //storing the guess in a mapping.
    guess[msg.sender] = _guess;
 
    //storing the request ID and the guess in a reverse mapping.
    reverseID[s_requestId] = _guess;
    //storing the request ID and the address of the sender in a reverse mapping.
    reverseAD[s_requestId] = msg.sender;



  }

  

  
  //the fulfillRandomWords function takes in the request ID and the random number as parameters.The function fulfillRandomWords is called by the chainlink oracle when the random number is generated and delivered to the smart contract
  function fulfillRandomWords(
    uint256 _id,
    uint256[] memory randomWords
  ) internal override {


    //the random number is stored in the mapping randomnumber. the operator % followed by 100 plus one is used to ensure that the random number is between 1 and 100.
    randomnumber[_id] = (randomWords[0] % 100) + 1;
    
    //setting the payout values in case the user guesses the correct number or is within 10 points of the correct number
    uint payout = address(this).balance/2;
    uint minipayout = address(this).balance/10;
  
    //incrementing the bet id variable by 1
    betid += 1;

    //setting the mappings for the NFT characteristics as per each of the 6 random numbers generated by the oracle for a given betid. the operator % followed by 10 plus one is used to ensure that the random numbers are between 1 and 10.
    colormappingone[betid] = (randomWords[0] % 10)+1;
    colormappingtwo[betid] = (randomWords[1] % 10)+1;
    colormappingthree[betid] = (randomWords[2] % 10)+1;  
    colormappingfour[betid] = (randomWords[3] % 10)+1;
    colormappingfive[betid] = (randomWords[4] % 10)+1;
    colormappingsix[betid] = (randomWords[5] % 10)+1;
    
    if (randomnumber[_id]== reverseID[_id]) {
    
    //if the random number is equal to the number guessed by the user, the user is paid out half of the contract balance.
    (bool sent,) = reverseAD[_id].call{value: payout}("");

    
    if (!sent) {
      revert NotEnoughEtherSent();
    }

    
   //emit the Guesses event for full payout
    emit Guesses(reverseAD[_id],reverseID[_id],_id,randomnumber[_id],"Match!",payout,betid);
    
    } else if(randomnumber[_id]> reverseID[_id] && (randomnumber[_id]-reverseID[_id])<=10) {

    //if the random number is within 10 points of the number guessed by the user, the user is paid out 10% of the contract balance.
    (bool sent,) = reverseAD[_id].call{value: minipayout}("");
        if (!sent) {
      revert NotEnoughEtherSent();
    }
    //emit the Guesses event for mini payout
    emit Guesses(reverseAD[_id],reverseID[_id],_id,randomnumber[_id],"Within a 10 point distance",minipayout,betid);

    
    } else if(randomnumber[_id]< reverseID[_id] && (reverseID[_id]-randomnumber[_id])<=10) {

    //if the random number is within 10 points of the number guessed by the user, the user is paid out 10% of the contract balance.
    (bool sent,) = reverseAD[_id].call{value: minipayout}("");
        if (!sent) {
      revert NotEnoughEtherSent();
    }
    //emit the Guesses event for mini payout
    emit Guesses(reverseAD[_id],reverseID[_id],_id,randomnumber[_id],"Within a 10 point distance",minipayout,betid);

    //if the user has not guessed the correct number or is within 10 points of the correct number, the function checks if the random number delivered by the oracle is a prime number. If it is, the user is eligible to mint an NFT.
    } else if (isPrime(randomnumber[_id])) {
              

              //setting the canmintnft mapping to true allow the user to mint an NFT.
              canmintnft[reverseAD[_id]] = true;

              //emit the Guesses event for prime number
              emit Guesses(reverseAD[_id],reverseID[_id],_id,randomnumber[_id],"Prime number, you can mint a SVG NFT!",0,betid); }
  
              
    
    //emiting the Guesses event for all other cases
    else { emit Guesses(reverseAD[_id],reverseID[_id],_id,randomnumber[_id],"No Match!",0,betid);}} 
  
  //defining a function to check if a number is prime
  //the function isPrime() takes a number as an argument and returns a boolean value.
  function isPrime(uint num) public view returns (bool){
    //the function checks if the number is less than 2. If it is, it returns false.
    if (num < 2) {
        return false;
    } else {
    //if the number is greater than or equal to 2, the function loops through all the numbers from 2 to the number itself.
    for (uint i = 2; i < num; i++) {
      //if the number is divisible by any of the numbers in the loop, the function returns false.
        if (num % i == 0) {
            return false;
        } } }
    //if the number is not divisible by any of the numbers in the loop, the function returns true.
    return true;
}

  //defining a function to mint an NFT
  function mintnft() public {
    //if the number of NFTs minted is less than 25, the user can mint an NFT.
    if (_tokenIds.current() >24) {
      revert CanNotMintMore();
    }
    //if the canmintnft mapping is set to true, the user can mint an NFT.
    if (canmintnft[msg.sender] == false) {
      revert CanNotMintOne();
    }
    
    //incrementing the token id by 1
    _tokenIds.increment();
    //storing the token id in a variable
    uint256 id = _tokenIds.current();
    //minting the NFT
    _mint(msg.sender, id);
    //setting the canmintnft mapping to false to prevent the user from minting more than one NFT per prime number drawn by the oracle.
    canmintnft[msg.sender] = false; 
    }


//function with the NFT metadata
function tokenURI(uint256 id) public view override returns (string memory) {
      if (_exists(id) == false) {
        revert TokenDoesNotExist();
      }
  
      string memory name = string(abi.encodePacked('Dope Vortex #',id.toString()));
      string memory description = string(abi.encodePacked('Random on-chain vortex animated SVG NFT'));
      string memory image = Base64.encode(bytes(generateSVGofTokenById(id)));

      return
          string(
              abi.encodePacked(
                'data:application/json;base64,',
                Base64.encode(
                    bytes(
                          abi.encodePacked(
                              '{"name":"',
                              name,
                              '", "description":"',
                              description,
                              '","owner":"',
                              (uint160(ownerOf(id))).toHexString(20),
                              '", "image": "',
                              'data:image/svg+xml;base64,',
                              image,
                              '"}'
                          )
                        )
                    )
              )
          );
  }

  //function to generate the SVG of the NFT
  function generateSVGofTokenById(uint256 id) internal view returns (string memory) {

    string memory svg = string(abi.encodePacked(
      '<svg version="1.1" width="330" height="330" viewBox="-40 -40 330 330" fill="none" stroke="#000" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
        renderTokenById(id),
      '</svg>'
    ));

    return svg;
  }

  //array of colors for the NFT to be determined in reference to the 6 random numbers generated by the oracle
  string[] allcolors = ["blue","red","yellow","green","pink","orange","violet","gray","purple","black"];

  function renderTokenById(uint256 id) public view returns (string memory) {
 
    //the animated svg itself is generated by a function that takes the token id as an argument and returns a string
    string memory render = string(abi.encodePacked(
      '<defs>',
    '<path id="r1">',
    '<animate id="p1" attributeName="d" values="m160,160l0,0 0,0;m',colormappingone[id].toString(),',30l10,3 2,10;m130,110l30,-17 30,17;m60,30l10,17 30,17;m160,20l0,0 0,0;m160,160l0,0 0,0" dur="',colormappingone[id].toString(),'s" repeatCount="indefinite" stroke=" #a09cd3"/>',
    '<animate attributeName="stroke-width" values="2;2;5;6;5;2;2" dur="7s" repeatCount="indefinite" begin="p1.begin"/>',
    '<animate attributeName="stroke" values="',allcolors[colormappingone[id]],';',allcolors[colormappingtwo[id]],'" dur="7s" repeatCount="indefinite"/>',
    '</path>',
    '<path id="r2">',
    '<animate attributeName="d" values="m160,160l0,0 0,0;m',colormappingtwo[id].toString(),',30l10,3 2,10;m130,110l30,-17 30,17;m60,30l10,17 30,17;m160,20l0,0 0,0;m160,160l0,0 0,0" dur="',colormappingfour[id].toString(),'s" repeatCount="indefinite" begin="p1.begin+1s"/>',
    '<animate attributeName="stroke-width" values="2;2;5;6;5;2;2" dur="8s" repeatCount="indefinite" begin="p1.begin+1s"/>',
    '<animate attributeName="stroke" values="',allcolors[colormappingthree[id]],';',allcolors[colormappingfour[id]],'" dur="6s" repeatCount="indefinite"/>',
    '</path>',
    '<path id="r3">',
    '<animate attributeName="d" values="m160,160l0,0 0,0;m60,30l10,3 2,10;m130,110l30,-17 30,17;m60,30l10,17 30,17;m160,20l0,0 0,0;m160,160l0,0 0,0" dur="',colormappingsix[id].toString(),'s" repeatCount="indefinite" begin="p1.begin+2s"/>',
    '<animate attributeName="stroke-width" values="2;2;5;6;5;2;2" dur="6s" repeatCount="indefinite" begin="p1.begin+2s"/>',
    '<animate attributeName="stroke" values="',allcolors[colormappingfive[id]],';',allcolors[colormappingsix[id]],'" dur="8s" repeatCount="indefinite"/>',
    '</path>',
    '</defs>',
    '<use xlink:href="#r1" transform="rotate(60 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(100 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(140 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(180 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(220 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(260 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(300 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(340 110 110)"/>',
    '<use xlink:href="#r1" transform="rotate(380 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(60 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(100 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(140 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(180 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(220 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(260 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(300 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(340 110 110)"/>',
    '<use xlink:href="#r2" transform="rotate(380 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(60 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(100 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(140 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(180 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(220 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(260 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(300 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(340 110 110)"/>',
    '<use xlink:href="#r3" transform="rotate(380 110 110)"/>',
    '<circle cx="110.5" cy="110" r="0" >',
    '<animate attributeType="XML" attributeName="r" from="0" to="11" dur="6s" begin=".25s" repeatCount="indefinite" />',
    '</circle>',
    '<circle cx="110.5" cy="110" r="11" />'
     
        ));

    return render;
  }

  //function to allow the smart contract to receive ether
  receive() external payable {

  }
  
  //function to allow pipoca to withdraw ether from the contract
  function withdraw() public payable {
    address owner = 0x8f9b1b9EAabE5A1CAd1C432Cb9AE03B9840661de;
    if (msg.sender != owner) {
      revert CanNotWithdraw();
    }

    (bool sent,) = owner.call{value: address(this).balance}("");
       if (!sent) {
      revert NotEnoughEtherSent();
    }

    
  }

}