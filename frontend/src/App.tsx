import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { TeacherDetail } from './pages/TeacherDetail';
import { Explorer } from './pages/Explorer';
import { Comparative } from './pages/Comparative';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="teacher/:id" element={<TeacherDetail />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="comparative" element={<Comparative />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
