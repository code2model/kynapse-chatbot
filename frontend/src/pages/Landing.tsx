import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import '../App.css';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <motion.div 
        className="landing-content glass-panel"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <motion.div
           animate={{ rotate: 360 }} 
           transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
           className="landing-logo"
        >
          <Sparkles size={80} className="text-gradient" />
        </motion.div>
        
        <h1 className="landing-title">Kynapse</h1>
        <p className="landing-subtitle">Welcome back to the future of conversation.</p>
        
        <button 
          onClick={() => navigate('/chat')}
          className="btn btn-primary btn-landing"
        >
          Take me to chat <ArrowRight size={20} className="ml-2" />
        </button>
      </motion.div>
    </div>
  );
}
