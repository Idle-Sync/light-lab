import { useAppState } from '../store';
import { kindTitles } from './inspector-fields';

export function BenchDescription() {
  const objects = useAppState((state) => state.scene.objects);
  return (
    <div id="bench-description" className="sr-only">
      <p>
        {objects.length} {objects.length === 1 ? 'object' : 'objects'} on the bench.
      </p>
      <ul>
        {objects.map((object) => (
          <li key={object.id}>
            {kindTitles[object.kind]} at x {object.x} mm, y {object.y} mm, angle {object.angle}°
          </li>
        ))}
      </ul>
    </div>
  );
}
