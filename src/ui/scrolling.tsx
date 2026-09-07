import { forwardRef, type ComponentProps } from 'react';
import {
  FlatList,
  ScrollView,
  type FlatListProps,
} from 'react-native';

/**
 * Jamais de barre / curseur de défilement visible.
 * Molette souris, trackpad et doigt suffisent (PC, tablette, téléphone).
 */
export function useShowScrollIndicators(): boolean {
  return false;
}

export const AppScrollView = forwardRef<
  ScrollView,
  ComponentProps<typeof ScrollView>
>(function AppScrollView(props, ref) {
  return (
    <ScrollView
      ref={ref}
      {...props}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
});

export const AppFlatList = forwardRef(function AppFlatList<ItemT>(
  props: FlatListProps<ItemT>,
  ref: React.ForwardedRef<FlatList<ItemT>>,
) {
  return (
    <FlatList
      ref={ref}
      {...props}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
}) as <ItemT>(
  props: FlatListProps<ItemT> & { ref?: React.ForwardedRef<FlatList<ItemT>> },
) => React.ReactElement;
