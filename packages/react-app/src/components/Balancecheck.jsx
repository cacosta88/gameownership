import React, { useState } from "react";
import { useBalance } from "eth-hooks";
import { Button, Col, Menu, Row, InputNumber, Table } from "antd";
const { ethers } = require("ethers");
//const { utils } = require("ethers");
const DEBUG = true;

export default function Balance(props) {
  const [dollarMode, setDollarMode] = useState(true);

  const balance = useBalance(props.provider, props.address);
  let floatBalance = parseFloat("0.00");
  let usingBalance = balance;

  if (typeof props.balance !== "undefined") usingBalance = props.balance;
  if (typeof props.value !== "undefined") usingBalance = props.value;

  if (usingBalance) {
    const etherBalance = ethers.utils.formatEther(usingBalance);
    parseFloat(etherBalance).toFixed(2);
    floatBalance = parseFloat(etherBalance);
  }

  let displayBalance = false;

  const price = props.price || props.dollarMultiplier || 1;

  const check = floatBalance.toFixed(4);

  const [pendingRandomNumber, setPendingRandomNumber] = useState(false);
  const [number, setNumber] = useState();
  const handleChangeNumber = value => {
    if (DEBUG) console.log("Bet: ", value);
    setNumber(value);
  };

  if (check > 4) {
    displayBalance = true;
  }

  return (
    <span
      style={{
        verticalAlign: "middle",
        fontSize: props.size ? props.size : 24,
        padding: 4,
      }}
    >
      {!displayBalance ? (
        <p>
          Not enough link to safely draw random numbers. Only {check} link available. While each call usually consumes
          0.30 - 0.40, a safe minimum balance of 4 link has been established to prevent transaction failure.
        </p>
      ) : (
        <div>
          Enter a number between 1 and 100:{" "}
          <InputNumber value={number} min="1" max="100" step="1" placeholder="Your bet" onChange={handleChangeNumber} />
          <br></br>
          <br></br>
          <Button
            loading={pendingRandomNumber}
            disabled={number === undefined}
            onClick={async () => {
              setPendingRandomNumber(true);
              /* look how you call requestRandomNumber on your contract: */
              /* notice how you pass a call back for tx updates too */
              const result = props.tx(
                props.writeContracts.YourContract.requestRandomWords(number, {
                  value: ethers.utils.parseEther("0.001"),
                  gasLimit: 500000,
                }),
                update => {
                  console.log("📡 Transaction Update:", update);
                  if (update && update.data === "Reverted") {
                    setPendingRandomNumber(false);
                  }
                  if (update && (update.status === "confirmed" || update.status === 1)) {
                    setPendingRandomNumber(false);
                    console.log(" 🍾 Transaction " + update.hash + " finished!");
                    console.log(
                      " ⛽️ " +
                        update.gasUsed +
                        "/" +
                        (update.gasLimit || update.gas) +
                        " @ " +
                        parseFloat(update.gasPrice) / 1000000000 +
                        " gwei",
                    );
                  }
                },
              );
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Place a bet for Ξ0.001
          </Button>
        </div>
      )}
    </span>
  );
}
