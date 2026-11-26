import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

const amenityOptions: Array<{ label: string; icon: IconName }> = [
  { label: 'All', icon: 'apps-outline' },
  { label: '24hrs', icon: 'time-outline' },
  { label: 'Pool', icon: 'water-outline' },
  { label: 'Boxing', icon: 'fitness-outline' },
  { label: 'Yoga', icon: 'body-outline' },
  { label: 'Women-only', icon: 'female-outline' },
];

const priceOptions: Array<{ label: string; value: number | null }> = [
  { label: 'Any price', value: null },
  { label: '< ₱500', value: 500 },
  { label: '< ₱1,000', value: 1000 },
  { label: '< ₱2,000', value: 2000 },
];

interface FilterBarProps {
  amenity: string | null;
  maxPrice: number | null;
  onAmenityChange: (amenity: string | null) => void;
  onMaxPriceChange: (price: number | null) => void;
}

function FilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={[styles.chip, selected && styles.selectedChip]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? '#fff' : '#4a5852'} />}
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
    </Pressable>
  );
}

/** One horizontally scrolling row: amenities, a divider, then price caps. */
export default function FilterBar({
  amenity,
  maxPrice,
  onAmenityChange,
  onMaxPriceChange,
}: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrapper}
    >
      {amenityOptions.map((option) => (
        <FilterChip
          key={option.label}
          label={option.label}
          icon={option.icon}
          selected={option.label === 'All' ? amenity === null : amenity === option.label}
          onPress={() => onAmenityChange(option.label === 'All' ? null : option.label)}
        />
      ))}
      <View style={styles.divider} />
      {priceOptions.map((option) => (
        <FilterChip
          key={option.label}
          label={option.label}
          icon={option.value === null ? 'pricetag-outline' : undefined}
          selected={maxPrice === option.value}
          onPress={() => onMaxPriceChange(option.value)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 0,
    backgroundColor: '#f4f6f8',
  },
  row: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 7,
  },
  divider: {
    width: 1,
    height: 22,
    marginHorizontal: 4,
    backgroundColor: '#d3dad6',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d8dee5',
    backgroundColor: '#fff',
  },
  selectedChip: {
    borderColor: '#163b35',
    backgroundColor: '#163b35',
  },
  chipText: {
    color: '#34404b',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedChipText: {
    color: '#fff',
  },
});
