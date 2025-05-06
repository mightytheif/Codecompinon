import { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to your email.");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h2>Forgot Password</h2>
      <form onSubmit={handleReset}>
        <input type="email" placeholder="Enter Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ForgotPassword;
