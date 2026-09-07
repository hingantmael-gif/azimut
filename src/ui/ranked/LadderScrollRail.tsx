import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useShowScrollIndicators } from '../scrolling';
import { spacing } from '../../theme/tokens';

const THUMB_MIN = 52;
const ARROW_BTN = 20;
const TRACK_HEIGHT = 12;
const BAR_HIT = 18;
const THUMB_HEIGHT = 12;
const SCROLL_STEP = 110;

const TRACK_BG = '#F0F0F0';
const THUMB_BG = '#8A8A8A';
const ARROW_COLOR = '#505050';

type Props = {
  scrollX: number;
  contentWidth: number;
  layoutWidth: number;
  onScrollTo: (x: number, animated?: boolean) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ScrollArrow({ direction }: { direction: 'left' | 'right' }) {
  const size = 5;
  return (
    <View
      style={
        direction === 'left'
          ? {
              width: 0,
              height: 0,
              borderTopWidth: size,
              borderBottomWidth: size,
              borderRightWidth: size * 1.2,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderRightColor: ARROW_COLOR,
            }
          : {
              width: 0,
              height: 0,
              borderTopWidth: size,
              borderBottomWidth: size,
              borderLeftWidth: size * 1.2,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: ARROW_COLOR,
            }
      }
    />
  );
}

export function LadderScrollRail({
  scrollX,
  contentWidth,
  layoutWidth,
  onScrollTo,
}: Props) {
  const showRail = useShowScrollIndicators();
  const [trackWidth, setTrackWidth] = useState(0);
  const dragThumbLeftRef = useRef(0);
  const maxScrollRef = useRef(0);
  const thumbTravelRef = useRef(0);
  const thumbWidthRef = useRef(THUMB_MIN);
  const scrollXRef = useRef(scrollX);

  useEffect(() => {
    scrollXRef.current = scrollX;
  }, [scrollX]);

  const maxScroll = Math.max(0, contentWidth - layoutWidth);
  const scrollable = maxScroll > 4 && contentWidth > 0 && layoutWidth > 0;

  const metrics = useMemo(() => {
    const width = trackWidth || layoutWidth;
    const thumbWidth = scrollable
      ? Math.max(
          THUMB_MIN,
          Math.min(width, (layoutWidth / contentWidth) * width),
        )
      : width;
    const thumbTravel = Math.max(0, width - thumbWidth);
    const thumbLeft =
      scrollable && thumbTravel > 0 ? (scrollX / maxScroll) * thumbTravel : 0;
    return { thumbWidth, thumbTravel, thumbLeft };
  }, [scrollX, maxScroll, scrollable, layoutWidth, contentWidth, trackWidth]);

  maxScrollRef.current = maxScroll;
  thumbTravelRef.current = metrics.thumbTravel;
  thumbWidthRef.current = metrics.thumbWidth;

  const scrollFromThumbLeft = (thumbLeft: number, animated = false) => {
    const travel = thumbTravelRef.current;
    if (travel <= 0) return;
    const ratio = clamp(thumbLeft, 0, travel) / travel;
    onScrollTo(ratio * maxScrollRef.current, animated);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => maxScrollRef.current > 4,
      onMoveShouldSetPanResponder: () => maxScrollRef.current > 4,
      onPanResponderGrant: () => {
        const travel = thumbTravelRef.current;
        const max = maxScrollRef.current;
        dragThumbLeftRef.current =
          max > 0 && travel > 0 ? (scrollXRef.current / max) * travel : 0;
      },
      onPanResponderMove: (_, gesture) => {
        scrollFromThumbLeft(dragThumbLeftRef.current + gesture.dx);
      },
    }),
  ).current;

  const trackPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => maxScrollRef.current > 4,
      onMoveShouldSetPanResponder: () => maxScrollRef.current > 4,
      onPanResponderGrant: (e) => {
        const localX = e.nativeEvent.locationX;
        const thumbLeft = clamp(
          localX - thumbWidthRef.current / 2,
          0,
          thumbTravelRef.current,
        );
        dragThumbLeftRef.current = thumbLeft;
        scrollFromThumbLeft(thumbLeft);
      },
      onPanResponderMove: (_, gesture) => {
        scrollFromThumbLeft(dragThumbLeftRef.current + gesture.dx);
      },
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  if (!showRail || !scrollable) return null;

  const scrollBy = (delta: number) => {
    onScrollTo(clamp(scrollX + delta, 0, maxScroll), true);
  };

  const atStart = scrollX <= 2;
  const atEnd = scrollX >= maxScroll - 2;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => scrollBy(-SCROLL_STEP)}
        disabled={atStart}
        style={({ pressed }) => [
          styles.arrowBtn,
          pressed && styles.arrowBtnPressed,
          atStart && styles.arrowBtnDisabled,
        ]}
        accessibilityLabel="Défiler les rangs vers la gauche"
      >
        <ScrollArrow direction="left" />
      </Pressable>

      <View style={styles.trackHit} onLayout={onTrackLayout} {...trackPanResponder.panHandlers}>
        <View style={styles.groove} />
        <View
          style={[
            styles.thumb,
            {
              width: metrics.thumbWidth,
              transform: [{ translateX: metrics.thumbLeft }],
              ...(Platform.OS === 'web'
                ? ({ cursor: 'grab' } as object)
                : null),
            },
          ]}
          {...panResponder.panHandlers}
        />
      </View>

      <Pressable
        onPress={() => scrollBy(SCROLL_STEP)}
        disabled={atEnd}
        style={({ pressed }) => [
          styles.arrowBtn,
          pressed && styles.arrowBtnPressed,
          atEnd && styles.arrowBtnDisabled,
        ]}
        accessibilityLabel="Défiler les rangs vers la droite"
      >
        <ScrollArrow direction="right" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: 2,
  },
  arrowBtn: {
    width: ARROW_BTN,
    height: BAR_HIT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TRACK_BG,
    borderRadius: 2,
  },
  arrowBtnPressed: {
    backgroundColor: '#E4E4E4',
  },
  arrowBtnDisabled: {
    opacity: 0.45,
  },
  trackHit: {
    flex: 1,
    height: BAR_HIT,
    justifyContent: 'center',
    overflow: 'visible',
  },
  groove: {
    height: TRACK_HEIGHT,
    borderRadius: 6,
    backgroundColor: TRACK_BG,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: (BAR_HIT - THUMB_HEIGHT) / 2,
    height: THUMB_HEIGHT,
    borderRadius: 6,
    backgroundColor: THUMB_BG,
  },
});
