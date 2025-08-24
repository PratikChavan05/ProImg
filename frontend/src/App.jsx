import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { UserData } from "./context/UserContext";
import { Loading } from "./components/Loading";
import Navbar from "./components/Navbar";
import PinPage from "./pages/PinPage";
import Create from "./pages/Create";
import Account from "./pages/Account";
import UserProfile from "./pages/UserProfile";
import Forgot from "./pages/Forgot";
import Reset from "./pages/Reset";
import OtpVerify from "./pages/OtpVerify";
import UserConnections from "./pages/UserConnections";
import Chat from "./pages/Chat";
import MessageChat from "./pages/MessageChat";
import Conversations from "./pages/Conversation";

const App = () => {
  const { loading, isAuth, user} = UserData(); 
  // console.log(isAuth);
  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <BrowserRouter>
          
          {isAuth && <Navbar user={user} />}
          <Routes>
            <Route path="/" element={isAuth ? <Home /> : <Login />} />
            <Route
              path="/account"
              element={isAuth ? <Account user={user} /> : <Login />}
            />
            <Route
              path="/user/:id"
              element={isAuth ? <UserProfile user={user} /> : <Login />}
            />
            <Route path="/create" element={isAuth ? <Create /> : <Login />} />
            <Route
              path="/pin/:id"
              element={isAuth ? <PinPage user={user} /> : <Login />}
            />
            <Route path="/login" element={isAuth ? <Home /> : <Login />} />
            <Route path="/verify/:token" element={isAuth ? <Home /> : <OtpVerify/>} />
            <Route
              path="/register"
              element={ <Register />}
            />
            <Route
              path="/forgot"
              element={!isAuth ? <Forgot /> : <Home />} 
            />
            <Route
              path="/reset-password/:token"
              element={<Reset />}
            />
            <Route
              path="/get/:id"
              
              element={isAuth?<UserConnections />:<Login/>}
            />
            <Route
              path="/messages/:userId"
              
              element={isAuth?<MessageChat currentUser={user}/>:<Login/>} 
            />
            <Route
              path="/messages"
              
              element={isAuth?<Conversations loggedUser={user}/>:<Login/>}
            />

            
           
          </Routes>
        </BrowserRouter>
      )}
    </>
  );
};

export default App;
