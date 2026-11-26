import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';

const amenityOptions = ['All', '24hrs', 'Pool', 'Boxing', 'Yoga', 'Women-only'];
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
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selectedChip]}
    >
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FilterBar({
  amenity,
  maxPrice,
  onAmenityChange,
  onMaxPriceChange,
}: FilterBarProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {amenityOptions.map((option) => (
          <FilterChip
            key={option}
            label={option}
            selected={option === 'All' ? amenity === null : amenity === option}
            onPress={() => onAmenityChange(option === 'All' ? null : option)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, styles.priceRow]}
      >
        <Text style={styles.priceLabel}>Monthly/session price</Text>
        {priceOptions.map((option) => (
          <FilterChip
            key={option.label}
            label={option.label}
            selected={maxPrice === option.value}
            onPress={() => onMaxPriceChange(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#f4f6f8',
  },
  row: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  priceRow: {
    paddingBottom: 6,
  },
  priceLabel: {
    color: '#66717d',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  chip: {
    paddingHorizontal: 13,
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
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#fff',
  },
});
