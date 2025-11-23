import GranularControl from './components/GranularControl';
import Waveform from './components/Waveform';
import { useGranularStore } from './store/useGranularStore';
import './App.css';

function App() {
  const audioBuffer = useGranularStore((state) => state.audioBuffer);

  return (
    <div className="App">
      <h1>Granular Sampler MVP</h1>
      <GranularControl />
      {audioBuffer && <Waveform buffer={audioBuffer} />}
    </div>
  );
}

export default App;
