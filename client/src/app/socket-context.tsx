/**
 * SocketContext – wraps socket.io-client and provides a global socket
 * instance to the rest of the app. After login the socket automatically
 * joins the user's personal notification room so that targeted events
 * (notification:sent, status:updated) arrive instantly.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
  /** The logged-in user's MongoDB _id. Pass null/undefined when not logged in. */
  userId?: string | null;
}

export function SocketProvider({ children, userId }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect directly to the backend to bypass Vite proxy crash on Bun
    const socket = io("http://127.0.0.1:5001", {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // When the userId is known, join the personal notification room
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !userId) return;

    const joinRoom = () => socket.emit("join:user", userId);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
