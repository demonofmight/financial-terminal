import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';

interface LoadingScreenProps {
  progress?: number;
  message?: string;
}

export function LoadingScreen({ progress = 0, message }: LoadingScreenProps) {
  const { language } = useLanguage();

  const loadingMessages = {
    en: [
      'Connecting to markets...',
      'Fetching sector data...',
      'Loading global indices...',
      'Retrieving crypto prices...',
      'Analyzing market sentiment...',
      'Almost there...',
    ],
    tr: [
      'Piyasalara bağlanılıyor...',
      'Sektör verileri alınıyor...',
      'Dünya endeksleri yükleniyor...',
      'Kripto fiyatları alınıyor...',
      'Piyasa duyarlılığı analiz ediliyor...',
      'Neredeyse hazır...',
    ],
  };

  const messages = loadingMessages[language] || loadingMessages.en;
  const currentMessage = message || messages[Math.min(Math.floor(progress / 20), messages.length - 1)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] bg-terminal-bg flex flex-col items-center justify-center"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-lg bg-accent-green/20 flex items-center justify-center border border-accent-green/30"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0)',
                  '0 0 20px 10px rgba(34, 197, 94, 0.1)',
                  '0 0 0 0 rgba(34, 197, 94, 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-accent-green font-bold text-xl">F</span>
            </motion.div>
            <div>
              <h1 className="text-2xl font-display tracking-wider text-white">FINTERM</h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                Financial Terminal
              </p>
            </div>
          </div>
        </motion.div>

        {/* Loading spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-20 h-20 mb-8"
        >
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent-cyan/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Middle ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-accent-cyan border-r-accent-cyan"
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />

          {/* Inner ring */}
          <motion.div
            className="absolute inset-4 rounded-full border-2 border-transparent border-t-accent-green"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />

          {/* Center dot */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="w-2 h-2 rounded-full bg-accent-cyan" />
          </motion.div>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-64 mb-4"
        >
          <div className="h-1 bg-terminal-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-cyan to-accent-green rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-neutral-500">
            <span>{Math.round(progress)}%</span>
            <span>{language === 'tr' ? 'Yükleniyor' : 'Loading'}</span>
          </div>
        </motion.div>

        {/* Loading message */}
        <motion.p
          key={currentMessage}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-sm text-neutral-400"
        >
          {currentMessage}
        </motion.p>

        {/* Market indicators animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex items-center gap-4"
        >
          {['S&P', 'BTC', 'EUR'].map((symbol, i) => (
            <motion.div
              key={symbol}
              className="flex items-center gap-1 text-[10px]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            >
              <span className="text-neutral-500">{symbol}</span>
              <motion.span
                className={i % 2 === 0 ? 'text-accent-green' : 'text-accent-red'}
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
              >
                {i % 2 === 0 ? '↑' : '↓'}
              </motion.span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
