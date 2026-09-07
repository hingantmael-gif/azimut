import { useMemo, useRef } from 'react';
import {
  PanResponder,
  Platform,
  type GestureResponderHandlers,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type ScrollTarget = {
  scrollTo: (opts: { x: number; animated?: boolean }) => void;
};

type Opts = {
  /** Largeur contenu − largeur viewport (0 si pas encore mesuré). */
  getMaxOffset: () => number;
  /** Offset courant (suivi via onScroll). */
  getOffset: () => number;
  /** Applique le scroll. */
  scrollTo: (x: number, animated?: boolean) => void;
  /** Seuil avant de capturer le geste (évite de voler les taps). */
  activationDx?: number;
};

/**
 * Glisser horizontalement (souris ou doigt) pour faire défiler une liste / ScrollView.
 * Sur web, le drag souris ne marche pas nativement sur FlatList/ScrollView.
 */
export function useHorizontalDragScroll(opts: Opts): {
  panHandlers: GestureResponderHandlers;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onWheel?: (e: { nativeEvent?: { deltaX?: number; deltaY?: number }; deltaX?: number; deltaY?: number; preventDefault?: () => void }) => void;
  offsetRef: React.MutableRefObject<number>;
} {
  const offsetRef = useRef(0);
  const startOffset = useRef(0);
  const activationDx = opts.activationDx ?? 8;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > activationDx && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > activationDx && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startOffset.current = optsRef.current.getOffset();
        },
        onPanResponderMove: (_, g) => {
          const max = optsRef.current.getMaxOffset();
          const next = clamp(startOffset.current - g.dx, 0, Math.max(0, max));
          optsRef.current.scrollTo(next, false);
          offsetRef.current = next;
        },
      }),
    [activationDx],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.x;
  };

  const onWheel =
    Platform.OS === 'web'
      ? (e: {
          nativeEvent?: { deltaX?: number; deltaY?: number };
          deltaX?: number;
          deltaY?: number;
          preventDefault?: () => void;
        }) => {
          const dx = e.nativeEvent?.deltaX ?? e.deltaX ?? 0;
          const dy = e.nativeEvent?.deltaY ?? e.deltaY ?? 0;
          const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          if (!delta) return;
          e.preventDefault?.();
          const max = optsRef.current.getMaxOffset();
          const next = clamp(optsRef.current.getOffset() + delta, 0, Math.max(0, max));
          optsRef.current.scrollTo(next, false);
          offsetRef.current = next;
        }
      : undefined;

  return {
    panHandlers: panResponder.panHandlers,
    onScroll,
    onWheel,
    offsetRef,
  };
}

/** Helper pour brancher un ScrollView / liste via ref. */
export function scrollTargetFromRef(
  ref: React.RefObject<ScrollTarget | null>,
): (x: number, animated?: boolean) => void {
  return (x, animated = false) => {
    ref.current?.scrollTo({ x, animated });
  };
}
