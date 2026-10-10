import { motion } from 'framer-motion';

export default function Page({ children, className = '' }) {
  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }} className={className}>
      {children}
    </motion.main>
  );
}
