import { Button, Col, Menu, Row, InputNumber, Table } from "antd";

import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import {
  Account,
  Contract,
  Faucet,
  GasGauge,
  Header,
  Ramp,
  ThemeSwitch,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
  Address,
  Events,
  Mint,
  TokenBalance,
  Balance,
  Balancecheck,
} from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import { Home, ExampleUI, Hints, Subgraph, Nfts, Minting } from "./views";
import { useStaticJsonRPC } from "./hooks";

const { ethers } = require("ethers");

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.goerli; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "goerli"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);
  //balance update
  const [updateBalances, setUpdateBalances] = useState(0);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "YourContract", "purpose");

  const betEvents = useEventListener(readContracts, "YourContract", "Guesses", localProvider, 11360051);
  const betColumns = [
    {
      title: "Player",
      dataIndex: "player",
      render: (text, record, index) => {
        return <Address noCopy={true} value={record.args.guesser} ensProvider={mainnetProvider} fontSize={16} />;
      },
    },
    {
      title: "Guessed",
      dataIndex: "theguess",
      render: (text, record, index) => {
        return record.args.theguess.toString();
      },
    },
    {
      title: "Verifiable Random Number",
      dataIndex: "vrf",
      render: (text, record, index) => {
        return record.args.randomnumber.toString();
      },
    },
    {
      title: "Guess match",
      dataIndex: "guessmatch",
      render: (text, record, index) => {
        return record.args.guessmatch;
      },
    },
    {
      title: "Payout",
      dataIndex: "payout",
      render: (text, record, index) => {
        return "Ξ" + Math.round(ethers.utils.formatEther(record.args.payout.toString()) * 1e4) / 1e4;
      },
    },
  ];
  const [pendingRandomNumber, setPendingRandomNumber] = useState(false);
  const [number, setNumber] = useState();
  const handleChangeNumber = value => {
    if (DEBUG) console.log("Bet: ", value);
    setNumber(value);
  };

  const cannftbeminted = useContractReader(readContracts, "YourContract", "canmintnft", [address]);
  const seesub = useContractReader(readContracts, "YourContract", "getsubbalance");
  const totalSupply = useContractReader(readContracts, "YourContract", "totalSupply");
  const nftsLeft = 25 - totalSupply;

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    myMainnetDAIBalance,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  const [pending, setPending] = useState(false);

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header>
        {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1 }}>
            {USE_NETWORK_SELECTOR && (
              <div style={{ marginRight: 20 }}>
                <NetworkSwitch
                  networkOptions={networkOptions}
                  selectedNetwork={selectedNetwork}
                  setSelectedNetwork={setSelectedNetwork}
                />
              </div>
            )}
            <Account
              useBurner={USE_BURNER_WALLET}
              address={address}
              localProvider={localProvider}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              price={price}
              web3Modal={web3Modal}
              loadWeb3Modal={loadWeb3Modal}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
              blockExplorer={blockExplorer}
            />
          </div>
        </div>
      </Header>
      {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
        <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
      )}
      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />
      <Menu style={{ textAlign: "center", marginTop: 20 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/tldr">
          <Link to="/tldr">TLDR</Link>
        </Menu.Item>
        <Menu.Item key="/">
          <Link to="/">Play</Link>
        </Menu.Item>
        <Menu.Item key="/nfts">
          <Link to="/nfts">NFTs you own</Link>
        </Menu.Item>
        <Menu.Item key="/debug">
          <Link to="/debug">Debug Contracts</Link>
        </Menu.Item>
      </Menu>

      <Switch>
        <Route exact path="/tldr">
          <div style={{ maxWidth: 600, margin: "auto", marginTop: 32, paddingBottom: 15 }}>
            <h1>Gamification of access to utilities</h1>
            <br></br>
            <h2>The problem </h2>
            <p>
              It is well known that the concentration of ownership of a utility or asset can exacerbate macro- and
              micro-economic threats to the value and sustainability of such an asset or utility. This is particularly
              true for crypto assets.
            </p>
            <br></br>
            <p>
              Concentration of ownership can lead to market manipulation. For example, if a small group of investors
              owns a large percentage of a particular asset, they may collude to artificially drive up the price. This
              can cause problems for other investors as well as for the economy in general.
            </p>
            <br></br>
            <p>
              Concentration of ownership can also lead to problems in the efficient allocation of resources. For
              example, if a small group of investors owns a large percentage of a particular asset, they may be
              reluctant to sell it, even if it would be in the interest of the economy as a whole. This can lead to
              suboptimal outcomes and inefficiencies.
            </p>
            <br></br>
            <p>
              Other issues: Lack of competition, which can lead to higher prices and lower quality. Cronyism, as those
              with good relationships are more likely to gain access to resources. Lack of accountability, as those in
              charge are less likely to be held accountable for their actions. Lack of transparency, as those in charge
              are less willing to share information with the public.
            </p>
            <br />
            <h2>Potentially mitigating solution</h2>
            <p>
              Gamification can mitigate these problems by making it more difficult for a small group of people to
              monopolize access.
            </p>
            <br></br>
            <h2>Illustrative proof of concept DApp</h2>
            <p>
              The illustrative proof of concept app gamifies the minting of an on-chain NFT, providing a speedbump to
              mass minting by a single player. This is achieved by requiring the player to randomly draw a prime number
              between 1 and 100 before minting an NFT. The possibility of winning a portion of the accumulated balance
              forms the risk/reward element of the game.
            </p>
          </div>
        </Route>
        <Route exact path="/">
          {/* pass in any web3 props to this Home component. For example, yourLocalBalance */}

          <br></br>
          <div style={{ maxWidth: 820, margin: "auto", marginTop: 32, paddingBottom: 5 }}>
            <div style={{ fontSize: 16 }}>
              <p>
                Current pot amount:{" "}
                <Balance
                  address={readContracts && readContracts.YourContract ? readContracts.YourContract.address : null}
                  provider={localProvider}
                  price={price}
                />
              </p>
              <p>Guess the correct number and win 1/2 of the pot amount</p>
              <p>Guess a number within a 10 point distance and win 1/10 of the pot</p>
              <p>All bets are added to the pot</p>
              <p>
                If a prime number is drawn, you get an on-chain generative and animated SVG NFT like the one below:
                <img src="https://i.postimg.cc/prVmyyS4/F349-A004-1148-4-CD0-9-CC7-245-BEF60-D7-AE.gif" />
              </p>
            </div>
          </div>

          <Balancecheck balance={seesub} tx={tx} writeContracts={writeContracts} />

          <div style={{ maxWidth: 820, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
            {cannftbeminted ? (
              <div>
                {" "}
                <Button
                  onClick={async () => {
                    setPending(true);
                    await tx(writeContracts.YourContract.mintnft());
                    setPending(false);
                  }}
                  isLoading={pending}
                >
                  You can mint an NFT now! {nftsLeft} left
                </Button>
              </div>
            ) : (
              <p>
                You can not mint son. Draw a prime number to be able to mint! there are {nftsLeft} NFTs that can still
                be minted
              </p>
            )}
            <br></br>
            <Events
              contracts={readContracts}
              contractName="YourContract"
              eventName="Guesses"
              localProvider={localProvider}
              mainnetProvider={mainnetProvider}
              startBlock={1}
            />
          </div>
        </Route>
        <Route exact path="/debug">
          {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}
          <br></br>

          <Contract
            name="YourContract"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
        </Route>
        <Route path="/nfts">
          <Nfts
            DEBUG={DEBUG}
            readContracts={readContracts}
            writeContracts={writeContracts}
            tx={tx}
            mainnetProvider={mainnetProvider}
            blockExplorer={blockExplorer}
            address={address}
            updateBalances={updateBalances}
            setUpdateBalances={setUpdateBalances}
          />
        </Route>
      </Switch>

      <ThemeSwitch />

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              faucetAvailable ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;
