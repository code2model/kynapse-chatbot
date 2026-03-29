import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:conversationId" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
