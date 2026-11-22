import { createRoot } from 'react-dom/client';
import { AuthScreen } from '../packages/ui/src/auth/AuthScreen';
import { JourneyHarness } from './journey-harness';

function App() {
  if (window.location.pathname === '/register') {
    return <AuthScreen />;
  }
  if (window.location.pathname === '/journey') {
    return <JourneyHarness />;
  }
  return <h1>OTOMIX E2E harness</h1>;
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('E2E root element is missing');
}

createRoot(root).render(<App />);
