import { motion } from 'framer-motion';
import { ExternalLink, Clock } from 'lucide-react';

interface NewsCardProps {
  title: string;
  description: string;
  source: string;
  url: string;
  image: string;
  published_at: string;
  index: number;
}

export default function NewsCard({ title, description, source, url, image, published_at, index }: NewsCardProps) {
  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <div className="news-card-image-wrapper">
        {image ? (
          <img src={image} alt={title} className="news-card-image" loading="lazy" />
        ) : (
          <div className="news-card-image-placeholder">
            <span>📰</span>
          </div>
        )}
        <div className="news-card-image-overlay" />
        <span className="news-card-source-badge">{source}</span>
      </div>
      <div className="news-card-body">
        <h3 className="news-card-title">{title}</h3>
        <p className="news-card-description">{description}</p>
        <div className="news-card-footer">
          <span className="news-card-time">
            <Clock size={12} />
            {timeAgo(published_at)}
          </span>
          <ExternalLink size={14} className="news-card-link-icon" />
        </div>
      </div>
    </motion.a>
  );
}
