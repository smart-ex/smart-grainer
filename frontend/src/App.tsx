import GranularControl from './components/GranularControl';
import Waveform from './components/Waveform';
import { useGranularStore } from './store/useGranularStore';
import './App.css';

function App() {
  const audioBuffer = useGranularStore((state) => state.audioBuffer);
  const processedBuffer = useGranularStore((state) => state.processedBuffer);

  return (
    <div className="App">
      <h1>Granular Sampler MVP</h1>
      <GranularControl />
      {processedBuffer && <Waveform buffer={processedBuffer} />}
      {!processedBuffer && audioBuffer && <Waveform buffer={audioBuffer} />}
    </div>
  );
}

export default App;
