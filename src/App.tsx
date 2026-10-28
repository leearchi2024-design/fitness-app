import { TabBar } from './components/TabBar';
import { Onboarding } from './features/onboarding/Onboarding';
import { Calendar } from './pages/Calendar';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { Food } from './pages/Food';
import { Me } from './pages/Me';
import { Session } from './pages/Session';
import { SideEffectDetail, SideEffectList } from './pages/SideEffects';
import { Today } from './pages/Today';
import { Train } from './pages/Train';
import { useRoute } from './router';
import { useStore } from './store/AppStore';

export function App() {
  const { data } = useStore();
  const route = useRoute();

  // 還沒完成初次設定 → 進入設定流程
  if (!data.profile) return <Onboarding />;

  // 跟練模式為全螢幕，不顯示導覽列
  if (route.name === 'session') return <Session />;

  return (
    <div className="app">
      {route.name === 'today' && <Today />}
      {route.name === 'train' && <Train />}
      {route.name === 'exercise' && <ExerciseDetail id={route.id} />}
      {route.name === 'calendar' && <Calendar date={route.date} />}
      {route.name === 'food' && <Food />}
      {route.name === 'me' && <Me />}
      {route.name === 'care' && <SideEffectList />}
      {route.name === 'careDetail' && <SideEffectDetail id={route.id} />}
      <TabBar route={route} />
    </div>
  );
}
