import { useContext } from "react";
import { AuthContext } from "../contexts/auth_context";

export const useAuth = () => useContext(AuthContext);
