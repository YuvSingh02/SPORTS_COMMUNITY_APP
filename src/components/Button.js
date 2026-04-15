// components/Button.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';

const Button = ({
  title,
  onPress,
  variant  = 'primary',   // 'primary' | 'secondary' | 'ghost' | 'danger'
  size     = 'md',         // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled  = false,
  fullWidth = true,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || isLoading;

  const sizeStyles = {
    sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
    md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
    lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  };

  const textSizes = {
    sm: Typography.fontSizes.sm,
    md: Typography.fontSizes.base,
    lg: Typography.fontSizes.md,
  };

  if (variant === 'primary') {
    return (
      <LinearGradient
        colors={isDisabled ? ['#555', '#444'] : Colors.gradientPrimary}
        style={[styles.base, sizeStyles[size], fullWidth && styles.fullWidth, style]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          onPress={onPress}
          disabled={isDisabled}
          style={styles.inner}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textPrimary} size="small" />
          ) : (
            <Text style={[styles.text, { fontSize: textSizes[size] }, textStyle]}>
              {title}
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const variantStyles = {
    secondary: {
      container: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
      text:      { color: Colors.textPrimary },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text:      { color: Colors.primary },
    },
    danger: {
      container: { backgroundColor: Colors.error },
      text:      { color: Colors.textPrimary },
    },
  };

  const vs = variantStyles[variant] || variantStyles.secondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        vs.container,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <Text style={[styles.text, { fontSize: textSizes[size] }, vs.text, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
