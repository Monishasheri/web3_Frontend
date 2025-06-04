import React, { useState, useEffect } from "react";
import Web3 from "web3";
import axios from "axios";
import "./WalletConnector.css";

const WalletConnector = () => {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [amount, setAmount] = useState("");
  const [adminAddress, setAdminAddress] = useState("");

  useEffect(() => {
    const fetchAdminAddress = async () => {
      try {
        const response = await axios.get("http://localhost:3000/admin-address");
        setAdminAddress(response.data.adminAddress);
      } catch (error) {
        console.error("Failed to fetch admin address", error);
      }
    };

    fetchAdminAddress();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const userAccount = accounts[0];
        setAccount(userAccount);

        const web3 = new Web3(window.ethereum);
        const balanceWei = await web3.eth.getBalance(userAccount);
        const balanceEth = web3.utils.fromWei(balanceWei, "ether");
        setBalance(balanceEth);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  const handleConfirm = async () => {
    try {
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        alert("Please enter a valid ETH amount");
        return;
      }

      const web3 = new Web3(window.ethereum);
      const amountInWei = web3.utils.toWei(amount.toString(), "ether");
      console.log("amountInWei", amountInWei);
      const transactionObject = {
        from: account,
        to: adminAddress,
        value: amountInWei.toString(),
        gas: 21000,
        gasPrice: await web3.eth.getGasPrice(),
      };
      const tx = await web3.eth
        .sendTransaction(transactionObject)
        .on("transactionHash", (hash) => {
          console.log("Transaction Hash:", hash);
        })
        .on("receipt", (receipt) => {
          console.log("Transaction Receipt:", receipt);
        })
        .on("error", (error) => {
          console.error("Transaction Error:", error);
        });
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
      );
      const priceData = await priceRes.json();
      const ethUsdPrice = priceData.ethereum.usd;
      const dollarValue = (parseFloat(amount) * ethUsdPrice).toFixed(4);
      const response = await fetch("http://localhost:3000/store-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: account,
          amount: amount,
          balance: balance,
          dollar: dollarValue,
          txHash: tx.transactionHash,
        }),
      });

      const data = await response.json();
      if (data.status) {
        alert(
          `Success! ETH sent.\nTxHash: ${tx.transactionHash}.\nAdmin Balance:${data.data.balanceEth}`
        );
        setAmount("");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending ETH:", error);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="wallet-connector-container">
      <div className="wallet-connector-box">
        <h2>Wallet Connector</h2>
        <button onClick={connectWallet}>Connect Wallet</button>

        {account && (
          <>
            <p>
              <strong>User Account:</strong> {account}
            </p>
            <p>
              <strong>ETH Balance:</strong> {balance} ETH
            </p>

            <h3>Admin Wallet Address:</h3>
            <p>{adminAddress}</p>

            <div>
              <label htmlFor="amount">
                <strong>Enter Amount (ETH):</strong>
              </label>
              <br />
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Enter ETH amount"
                min="0"
                step="any"
              />
            </div>

            <button onClick={handleConfirm}>Confirm</button>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletConnector;
