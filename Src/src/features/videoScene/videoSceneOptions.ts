import type {
  CameraGuidanceOption,
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

export const cameraAngleOptions: CameraGuidanceOption[] = [
  {
    id: 'eye-level-angle',
    label: 'Eye-Level Angle',
    description: 'Frame the scene from a neutral human eye height.'
  },
  {
    id: 'high-angle',
    label: 'High Angle',
    description:
      'Look down on the subject to make the scene feel smaller or more vulnerable.'
  },
  {
    id: 'low-angle',
    label: 'Low Angle',
    description:
      'Look up at the subject to make it feel larger, stronger, or more imposing.'
  },
  {
    id: 'overhead-angle',
    label: 'Overhead Angle',
    description: 'Position the camera directly above the subject looking down.'
  },
  {
    id: 'worms-eye-view',
    label: "Worm's-Eye View",
    description:
      'Place the camera at ground level looking steeply upward for a dramatic, towering feel.'
  },
  {
    id: 'dutch-angle',
    label: 'Dutch Angle',
    description:
      'Tilt the camera sideways so the horizon is slanted for tension or unease.'
  },
  {
    id: 'ground-level-angle',
    label: 'Ground-Level Angle',
    description:
      'Keep the camera at the ground plane, level with the base of the subject.'
  },
  {
    id: 'shoulder-level-angle',
    label: 'Shoulder-Level Angle',
    description: 'Frame the scene from roughly the height of the subject\'s shoulders.'
  },
  {
    id: 'hip-level-angle',
    label: 'Hip-Level Angle',
    description: 'Position the camera at the subject\'s hip height.'
  },
  {
    id: 'knee-level-angle',
    label: 'Knee-Level Angle',
    description: 'Position the camera low at the subject\'s knee height.'
  },
  {
    id: 'aerial-angle',
    label: 'Aerial Angle',
    description:
      'Capture the scene from high above as if from an aircraft or tall vantage point.'
  },
  {
    id: 'top-down-angle',
    label: 'Top-Down Angle',
    description:
      'Look straight down on the scene from directly overhead for a flat, map-like framing.'
  }
];

export const cameraPerspectiveOptions: CameraGuidanceOption[] = [
  {
    id: 'first-person-pov',
    label: 'First-Person POV',
    description:
      "Describe the shot as if seen directly through a character or viewer's eyes."
  },
  {
    id: 'third-person-view',
    label: 'Third-Person View',
    description: 'Observe the subject from outside, showing it within the scene.'
  },
  {
    id: 'over-the-shoulder-view',
    label: 'Over-the-Shoulder View',
    description:
      "Frame the scene from behind or beside a character's shoulder, looking toward the action."
  },
  {
    id: 'objective-view',
    label: 'Objective View',
    description:
      'Use a neutral, detached viewpoint that observes events without a character vantage.'
  },
  {
    id: 'subjective-pov',
    label: 'Subjective POV',
    description:
      "Convey the scene through a specific character's personal experience and viewpoint."
  },
  {
    id: 'cctv-surveillance-view',
    label: 'CCTV / Surveillance View',
    description: 'Use a fixed observational surveillance-camera viewpoint.'
  },
  {
    id: 'handheld-view',
    label: 'Handheld View',
    description:
      'Use a natural handheld camera feel with subtle, organic movement.'
  },
  {
    id: 'found-footage-view',
    label: 'Found-Footage View',
    description:
      'Use a raw, documentary found-footage style as if recorded by a participant.'
  },
  {
    id: 'aerial-drone-view',
    label: 'Aerial / Drone View',
    description:
      'Capture the scene from a flying drone vantage with smooth aerial motion.'
  },
  {
    id: 'top-down-view',
    label: 'Top-Down View',
    description: 'View the scene from straight above for a flat, overhead perspective.'
  },
  {
    id: 'side-view-profile-view',
    label: 'Side View / Profile View',
    description: 'Frame the subject directly from the side in profile.'
  },
  {
    id: 'isometric-view',
    label: 'Isometric View',
    description:
      'Use an angled isometric-style perspective with consistent depth and no vanishing distortion.'
  }
];
