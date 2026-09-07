import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';

type Props = {
  uri: string;
  visible: boolean;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
};

const OUTPUT_SIZE = 512;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

/**
 * Cadrage circulaire : hors du cercle assombri.
 * Ce qui est dans le cercle = ce que les autres verront.
 */
export function AvatarCropModal({ uri, visible, onCancel, onConfirm }: Props) {
  const { colors } = useThemeColors();
  const { width: winW, height: winH } = useWindowDimensions();
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [saving, setSaving] = useState(false);

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const panStart = useRef({ x: 0, y: 0 });

  const cropDiameter = Math.min(winW * 0.78, winH * 0.42, 320);
  const cropR = cropDiameter / 2;
  const cx = winW / 2;
  const cy = winH * 0.42;

  useEffect(() => {
    if (!visible || !uri) return;
    setScale(1);
    setTx(0);
    setTy(0);
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    Image.getSize(
      uri,
      (w, h) => {
        setImgW(w);
        setImgH(h);
      },
      () => {
        Alert.alert('Image', 'Impossible de lire cette photo.');
        onCancel();
      },
    );
  }, [uri, visible, onCancel]);

  const baseScale = useMemo(() => {
    if (!imgW || !imgH) return 1;
    // Le côté le plus petit remplit le cercle (cover)
    return cropDiameter / Math.min(imgW, imgH);
  }, [imgW, imgH, cropDiameter]);

  const displayW = imgW * baseScale * scale;
  const displayH = imgH * baseScale * scale;

  const clampTranslation = useCallback(
    (nextTx: number, nextTy: number, nextScale: number) => {
      if (!imgW || !imgH) return { x: nextTx, y: nextTy };
      const dw = imgW * baseScale * nextScale;
      const dh = imgH * baseScale * nextScale;
      const maxX = Math.max(0, (dw - cropDiameter) / 2);
      const maxY = Math.max(0, (dh - cropDiameter) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, nextTx)),
        y: Math.max(-maxY, Math.min(maxY, nextTy)),
      };
    },
    [baseScale, cropDiameter, imgH, imgW],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          panStart.current = { x: txRef.current, y: tyRef.current };
        },
        onPanResponderMove: (_, g) => {
          const clamped = clampTranslation(
            panStart.current.x + g.dx,
            panStart.current.y + g.dy,
            scaleRef.current,
          );
          txRef.current = clamped.x;
          tyRef.current = clamped.y;
          setTx(clamped.x);
          setTy(clamped.y);
        },
      }),
    [clampTranslation],
  );

  const bumpScale = (delta: number) => {
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
    scaleRef.current = next;
    setScale(next);
    const clamped = clampTranslation(txRef.current, tyRef.current, next);
    txRef.current = clamped.x;
    tyRef.current = clamped.y;
    setTx(clamped.x);
    setTy(clamped.y);
  };

  const onSave = async () => {
    if (!imgW || !imgH || saving) return;
    setSaving(true);
    try {
      const s = baseScale * scaleRef.current;
      const dw = imgW * s;
      const dh = imgH * s;
      const left = cx - dw / 2 + txRef.current;
      const top = cy - dh / 2 + tyRef.current;

      let originX = (cx - cropR - left) / s;
      let originY = (cy - cropR - top) / s;
      let size = cropDiameter / s;

      // Clamp dans l’image source
      originX = Math.max(0, Math.min(imgW - size, originX));
      originY = Math.max(0, Math.min(imgH - size, originY));
      size = Math.min(size, imgW - originX, imgH - originY);

      const result = await manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(size),
              height: Math.round(size),
            },
          },
          { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } },
        ],
        { compress: 0.85, format: SaveFormat.JPEG, base64: true },
      );
      const durable = result.base64
        ? `data:image/jpeg;base64,${result.base64}`
        : result.uri;
      onConfirm(durable);
    } catch (e) {
      Alert.alert(
        'Cadrage',
        e instanceof Error ? e.message : 'Impossible de cadrer la photo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const ready = imgW > 0 && imgH > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.root, { backgroundColor: '#0A0A0A' }]}>
        <Text style={styles.title}>Cadrer ta photo</Text>
        <Text style={styles.sub}>
          Seul le contenu dans le cercle sera visible sur ton profil. Déplace et zoome pour
          ajuster.
        </Text>

        <View style={styles.stage} {...panResponder.panHandlers}>
          {ready ? (
            <Image
              source={{ uri }}
              style={{
                position: 'absolute',
                width: displayW,
                height: displayH,
                left: cx - displayW / 2 + tx,
                top: cy - displayH / 2 + ty,
              }}
              resizeMode="stretch"
            />
          ) : (
            <ActivityIndicator color="#fff" style={{ marginTop: cy - 20 }} />
          )}

          {/* Overlay : tout hors du cercle assombri */}
          <Svg
            width={winW}
            height={winH}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <Mask id="avatarHole" x="0" y="0" width={winW} height={winH}>
                <Rect x="0" y="0" width={winW} height={winH} fill="white" />
                <Circle cx={cx} cy={cy} r={cropR} fill="black" />
              </Mask>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={winW}
              height={winH}
              fill="rgba(0,0,0,0.62)"
              mask="url(#avatarHole)"
            />
            <Circle
              cx={cx}
              cy={cy}
              r={cropR}
              stroke="rgba(255,255,255,0.92)"
              strokeWidth={2.5}
              fill="transparent"
            />
          </Svg>
        </View>

        <View style={styles.zoomRow}>
          <Pressable style={styles.zoomBtn} onPress={() => bumpScale(-0.15)}>
            <Text style={styles.zoomText}>−</Text>
          </Pressable>
          <Text style={styles.zoomLabel}>Zoom</Text>
          <Pressable style={styles.zoomBtn} onPress={() => bumpScale(0.15)}>
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            onPress={() => void onSave()}
            disabled={!ready || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Utiliser</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 56 },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  sub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: spacing.lg,
  },
  stage: { flex: 1, overflow: 'hidden' },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  zoomBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  zoomLabel: { color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 13 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cancelText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
