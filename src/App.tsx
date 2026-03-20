import { TaskProvider } from './store/TaskContext'
import { HomeScreen } from './components/HomeScreen'

function App() {
  return (
    <TaskProvider>
      <HomeScreen />
    </TaskProvider>
  )
}

export default App
