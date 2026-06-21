import type {
  CameraPositionOption,
  EnvironmentChangeLevel
} from './videoSceneTypes';

export const defaultCameraOptions: CameraPositionOption[] = [
  {
    id: 'none',
    label: 'None / hold start camera',
    description: 'Keep the camera position and framing like the start frame.'
  },
  {
    id: 'slow-push-in',
    label: 'Slow push in',
    description: 'The camera gradually moves closer to the subject or scene.'
  },
  {
    id: 'slow-pull-back',
    label: 'Slow pull back',
    description: 'The camera gradually reveals more of the surrounding scene.'
  },
  {
    id: 'pan-left',
    label: 'Pan left',
    description: 'The camera turns or slides left across the scene.'
  },
  {
    id: 'pan-right',
    label: 'Pan right',
    description: 'The camera turns or slides right across the scene.'
  },
  {
    id: 'tilt-up',
    label: 'Tilt up',
    description: 'The camera tilts upward through the shot.'
  },
  {
    id: 'tilt-down',
    label: 'Tilt down',
    description: 'The camera tilts downward through the shot.'
  },
  {
    id: 'orbit-left',
    label: 'Orbit left',
    description: 'The camera arcs around the subject to the left.'
  },
  {
    id: 'orbit-right',
    label: 'Orbit right',
    description: 'The camera arcs around the subject to the right.'
  },
  {
    id: 'tracking-forward',
    label: 'Tracking forward',
    description: 'The camera follows forward with the subject or action.'
  },
  {
    id: 'tracking-backward',
    label: 'Tracking backward',
    description: 'The camera retreats while tracking the subject or action.'
  },
  {
    id: 'handheld-subtle',
    label: 'Handheld subtle',
    description: 'Use slight natural handheld camera motion.'
  },
  {
    id: 'crane-up',
    label: 'Crane up',
    description: 'The camera rises vertically while keeping scene continuity.'
  },
  {
    id: 'crane-down',
    label: 'Crane down',
    description: 'The camera descends vertically while keeping scene continuity.'
  },
  {
    id: 'dolly-zoom',
    label: 'Dolly zoom',
    description: 'The background scale shifts while subject framing changes.'
  },
  {
    id: 'locked-tripod',
    label: 'Locked tripod',
    description: 'No camera movement except natural scene motion.'
  }
];

export const environmentDescriptions: Record<EnvironmentChangeLevel, string> = {
  low: 'Keep most environment details stable; only subtle lighting, atmosphere, or object motion changes.',
  medium:
    'Allow clear but believable changes in environment, weather, props, crowd, light, or damage.',
  high: 'Allow major environmental transformation while keeping continuity between the start and end frames.'
};
