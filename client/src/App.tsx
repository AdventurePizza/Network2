// @ts-nocheck

import "./App.css";
import React, {
  useEffect,
  useState,
  useContext,
  useRef
} from "react";

//ui
import { Button, TextField, Switch } from "@material-ui/core";

//logic
import io from "socket.io-client";
import { DAppClient } from "@airgap/beacon-sdk";
//import _ from "underscore";
import { v4 as uuidv4 } from 'uuid';
import { FirebaseContext } from "./firebaseContext";
import { useSnackbar } from "notistack";
import 'emoji-mart/css/emoji-mart.css'
import { Picker } from 'emoji-mart'

const socketURL =
  window.location.hostname === "localhost"
    ? "ws://localhost:8000"
    : "wss://network2-backend.herokuapp.com";


const socket = io(socketURL, { transports: ["websocket"] });
const dAppClient = new DAppClient({ name: "Beacon Docs" });

const tempID = uuidv4();
function App() {
  const HistoryEndRef = useRef()
  const HistoryEndRef2 = useRef()
  const [activeAccount, setActiveAccount] = useState();
  const [synced, setSynced] = useState('sync');
  const [showUnsync, setShowUnsync] = useState(false);
  const [emoji, setEmoji] = useState();
  const { getProfileFB, setProfileFB, getAllProfilesFB } = useContext(FirebaseContext);
  const [profile, setProfile] = useState({ emoji: emoji, timestamp: Date.now(), key: tempID, username: "" });
  const [profiles, setProfiles] = useState(
    [
      { emoji: "blue", timestamp: Date.now(), key: tempID, username: "user x" },
    ]);
  const [usernameInput, setUsernameInput] = React.useState('Anon');
  const { enqueueSnackbar } = useSnackbar();
  const [statusHistory, setStatusHistory] = useState([]);

  const [showHistory, setShowHistory] = useState(false);
  //const [onlines, setOnlines] = useState([]);

  const handleChangeUsername = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.length < 25)
      setUsernameInput(event.target.value);
    else
      setUsernameInput(event.target.value.slice(0, 25));
  };

  const autoScroll = () => {
    setTimeout(async () => {
      HistoryEndRef.current.scrollIntoView({ behavior: 'smooth', block: "end", inline: "end" });
    }, 1500)
    setTimeout(async () => {
      if (HistoryEndRef2.current)
        HistoryEndRef2.current.scrollIntoView({ behavior: 'smooth', block: "end", inline: "end" });
    }, 200)
  }

  useEffect(() => {
    autoScroll();
    async function getProfiles() {
      let result = await getAllProfilesFB();
      setProfiles(result.recentStatus)
      setStatusHistory(result.history)
    }
    getProfiles();

  }, [getAllProfilesFB]);
  /*
    function isOnline(address) {
      console.log(address)
      console.log(onlines)
      onlines.find(function (prof, index) {
        if (prof.wallet === address) {
          return true;
        }
        return false;
      });
    }
  */

  useEffect(() => {

    const onProfileChange = (data) => {
      setStatusHistory((statusHistory.concat(data)).sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp)));
      autoScroll();

      //recent
      profiles.find(function (prof, index) {
        if (prof.key === data.key) {
          setProfiles([
            ...profiles.slice(0, index),
            data,
            ...profiles.slice(index + 1)
          ]
          )
          return true;
        }
        return false;
      });
    };

    /*const onOnlineChange = (data) => {
      console.log(data)
      setOnlines(data);
    };
*/

    socket.on('profile', onProfileChange);
    //socket.on('online', onOnlineChange);
    return () => {
      socket.off('profile', onProfileChange);
      //socket.off('online', onOnlineChange);

    };
  }, [profiles, setProfiles, statusHistory,
    //setOnlines
  ]);



  useEffect(() => {
    async function getAcc() {
      setActiveAccount(await dAppClient.getActiveAccount());
      if (activeAccount) {
        setSynced(activeAccount.address.slice(0, 6) + "..." + activeAccount.address.slice(32, 36));
        setShowUnsync(true);
        let tempProfile = await getProfileFB(activeAccount.address)
        setProfile(tempProfile);
        setUsernameInput(tempProfile.username)
        socket.emit('join', activeAccount.address);
      }
      else {
        setSynced('sync');
        setShowUnsync(false);
      }
    }
    getAcc();

  }, [activeAccount, getProfileFB]);



  async function unsync() {
    setActiveAccount(await dAppClient.getActiveAccount())
    if (activeAccount) {
      // User already has account connected, everything is ready
      dAppClient.clearActiveAccount().then(async () => {
        setActiveAccount(await dAppClient.getActiveAccount())
        setSynced('sync');
        setShowUnsync(false);
      });
    }
  }

  async function sync() {
    setActiveAccount(await dAppClient.getActiveAccount())
    //Already connected
    if (activeAccount) {
      setSynced(activeAccount.address)
      setShowUnsync(true);
      socket.emit('join', activeAccount.address);
      return activeAccount;
    }
    // The user is not synced yet
    else {
      try {
        console.log("Requesting permissions...");
        const permissions = await dAppClient.requestPermissions();
        setActiveAccount(await dAppClient.getActiveAccount())
        console.log("Got permissions:", permissions.address);
        setSynced(permissions.address)
        setShowUnsync(true);



      }
      catch (error) {
        console.log("Got error:", error);
      }
    }
  }

  function updateStatus() {
    if (activeAccount) {
      let timestamp = Date.now();
      setProfile({ ...profile, emoji: emoji, key: activeAccount.address, username: usernameInput, timestamp: timestamp })
      //add socket 
      socket.emit('profile', { ...profile, emoji: emoji, key: activeAccount.address, username: usernameInput, timestamp: timestamp });
      setProfileFB({ ...profile, emoji: emoji, key: activeAccount.address, username: usernameInput, timestamp: timestamp });
      setStatusHistory((statusHistory.concat([{ ...profile, emoji: emoji, key: activeAccount.address, username: usernameInput, timestamp: timestamp }])).sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp)));

      enqueueSnackbar("Status Updated ! ", {
        variant: "success",
      });
      setUsernameInput("");
      autoScroll();
    }
    else {
      sync();
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      updateStatus()
    }
  }

  return (
    <div >
      <div className="top-left" style={{ fontSize: "1em", display: "flex", alignItems: "center", marginLeft: 2 }} >
        <b>Network 2 📠</b>
        &nbsp;
        <Switch
          checked={true}
          onChange={() => {
            window.location.href = 'https://network1.cc/';
            return null;
          }}
        />
      </div>

      <div style={{ fontSize: "0.9em", marginTop: 3, marginLeft: 13 }}>
        <b>History</b>
      </div>


      <div style={{ display: "flex", width: "90%", marginLeft: "auto", marginRight: "auto", overflowX: "scroll" }} >
        {statusHistory && statusHistory.map((profile) => (
          <div key={profile.timestamp} style={{ textAlign: "center", marginInline: 6 }}>
            <div style={{ width: 100, height: 30, border: "solid 4px ", marginInline: 4 }}>
              <div style={{ textAlign: "center", fontSize: "1.4em" }}>
                {profile.emoji}
              </div>
            </div>

            <Button title={profile.key} size={"small"} onClick={async () => {
              navigator.clipboard.writeText(profile.key);
              enqueueSnackbar("Address copied ! " + profile.key, {
                variant: "success",
              });
            }} >{profile.username} </Button>
          </div>
        ))
        }
        <div ref={HistoryEndRef}></div>
      </div>


      <div style={{ fontSize: "0.9em", marginTop: 3, marginLeft: 13 }}>
        <Button size={"small"} onClick={() => { setShowHistory(!showHistory); autoScroll(); }} >Personal History {showHistory ? " 🔼" : " 🔽"} </Button>
      </div>
      {showHistory &&
        <div style={{ display: "flex", width: "90%", marginLeft: "auto", marginRight: "auto", overflowX: "scroll" }} >
          {statusHistory && statusHistory.map((profile) => (
            activeAccount && profile.key === activeAccount.address &&
            <div key={profile.timestamp} style={{ textAlign: "center", marginInline: 6 }}>
              <div style={{ width: 100, height: 30, border: "solid 4px ", marginInline: 4 }}>
                <div style={{ textAlign: "center", fontSize: "1.4em" }}>
                  {profile.emoji}
                </div>
              </div>
              <Button title={profile.key} size={"small"} onClick={async () => {
                navigator.clipboard.writeText(profile.key);
                enqueueSnackbar("Address copied ! " + profile.key, {
                  variant: "success",
                });
              }} >{profile.username} </Button>
            </div>
          ))
          }
          <div ref={HistoryEndRef2}></div>
        </div>
      }
      <div style={{ fontSize: "0.9em", marginTop: 3, marginLeft: 13 }}>
        <Button size={"small"} onClick={() => { setShowHistory(!showHistory); autoScroll(); }} >Recent Status {showHistory ? " 🔽" : " 🔼"} </Button>
      </div>
      {!showHistory &&
        <div style={{ display: "flex", width: "90%", marginLeft: "auto", marginRight: "auto", overflowX: "scroll" }} >
          <div style={{ textAlign: "center", marginInline: 6 }}>
            <div style={{ width: 100, height: 30, border: "solid 4px ", marginInline: 4 }}>
              <div style={{ textAlign: "center", fontSize: "1.4em" }}>
                {profile.emoji}
              </div>
            </div>

            <Button title={profile.key} size={"small"} onClick={async () => {
              navigator.clipboard.writeText(profile.key);
              enqueueSnackbar("Address copied ! " + profile.key, {
                variant: "success",
              });
            }} >{profile.username} </Button>
          </div>

          {profiles && profiles.map((profile) => (
            (!activeAccount || profile.key !== activeAccount.address) &&
            <div key={profile.key} style={{ textAlign: "center", marginInline: 6 }}>
              <div style={{ width: 100, height: 30, border: "solid 4px ", marginInline: 4 }}>
                <div style={{ textAlign: "center", fontSize: "1.4em" }}>
                  {profile.emoji}
                </div>
              </div>
              <Button title={profile.key} size={"small"} onClick={async () => {
                navigator.clipboard.writeText(profile.key);
                enqueueSnackbar("Address copied ! " + profile.key, {
                  variant: "success",
                });
              }} >{profile.username} </Button>
            </div>
          ))
          }
        </div>
      }
      <div style={{ width: "90%", marginLeft: "auto", marginRight: "auto" }} >

        <Picker title='Pick your emoji' emoji='point_up' onSelect={(emoji) => { console.log(emoji); setEmoji(emoji.native) }} />
        <br></br>

        <div style={{ display: "flex", alignItems: "center" }}>
          <TextField id="outlined-basic" size={"small"} label="info" variant="outlined" placeholder="Status" onChange={handleChangeUsername} value={usernameInput} onKeyPress={handleKeyPress} />
          <div style={{ width: 50, height: 30, border: "solid 4px ", marginInline: 4 }}>
            <div style={{ textAlign: "center", fontSize: "1.4em" }}>
              {emoji}
            </div>
          </div>
          <Button size={"small"} title={"update status"} onClick={() => { updateStatus() }} >  {activeAccount ? <u>update status</u> : <u>sync to join network1</u>} </Button>
        </div>
      </div>

      <div className="bottom-left" style={{ position: "absolute" }}>
        <Button title={"Adventure Networks"} size={"small"} onClick={() => { }} >  <div style={{ textAlign: "left" }}> Adventure <br></br>Networks </div> </Button>
      </div>

      <div className="bottom-right" style={{ position: "absolute", display: "flex", alignItems: "center" }} >
        {showUnsync && <Button size={"small"} title={"unsync"} onClick={() => { unsync() }} ><u>unsync</u> </Button>}

        {showUnsync && <div> | </div>}
        <Button title={"sync"} size={"small"} onClick={async () => { await sync(); }} ><u>{synced}</u> </Button>

      </div>
    </div >
  );
}

export default App;
