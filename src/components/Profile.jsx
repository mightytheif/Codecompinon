import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    alert("Logged out successfully");
    navigate("/login");
  };

  return (
    <div>
      <h2>User Profile</h2>
      {user ? <p>Email: {user.email}</p> : <p>No user logged in</p>}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Profile;
