import { List } from "antd";
import { useEventListener } from "eth-hooks/events/useEventListener";
import Address from "./Address";
import Balance from "./Balance";
import TokenBalance from "./TokenBalance";

/**
  ~ What it does? ~

  Displays a lists of events

  ~ How can I use? ~

  <Events
    contracts={readContracts}
    contractName="YourContract"
    eventName="SetPurpose"
    localProvider={localProvider}
    mainnetProvider={mainnetProvider}
    startBlock={1}
  />
**/
//event Guesses(address indexed guesser, uint  theguess,uint guessid,uint  randomnumber,string  guessmatch,uint  payout,uint betid);
export default function Events({ contracts, contractName, eventName, localProvider, mainnetProvider, startBlock }) {
  // 📟 Listen for broadcast events
  const events = useEventListener(contracts, contractName, eventName, localProvider, startBlock);

  return (
    <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
      <h2>Bet events - Wait approximately 60 seconds to see the result of your bet</h2>
      <List
        bordered
        dataSource={events}
        renderItem={item => {
          return (
            <List.Item key={item.blockNumber + "_" + item.args[1] + "_" + item.args[0]}>
              Bet id:
              <TokenBalance balance={item.args[6]} provider={localProvider} />
              Player:
              <Address address={item.args[0]} ensProvider={mainnetProvider} fontSize={16} />
              Guess:
              <TokenBalance balance={item.args[1]} provider={localProvider} />
              <br></br>
              The winning number was
              <TokenBalance balance={item.args[3]} provider={localProvider} />
              <br></br>
              {item.args[4]}
              <br></br>
              Payout:
              <Balance balance={item.args[5]} />
            </List.Item>
          );
        }}
      />
    </div>
  );
}
