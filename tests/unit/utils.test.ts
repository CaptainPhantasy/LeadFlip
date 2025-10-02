/**
 * Utility Functions Tests
 *
 * Tests utility functions used throughout the application
 *
 * [2025-10-01] Testing Agent: Created utility function tests
 */

import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn - Class Name Merger', () => {
    it('should merge class names correctly', () => {
      const result = cn('btn', 'btn-primary');
      expect(result).toBe('btn btn-primary');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('btn', isActive && 'active');
      expect(result).toBe('btn active');
    });

    it('should handle false/null/undefined values', () => {
      const result = cn('btn', false, null, undefined, 'primary');
      expect(result).toBe('btn primary');
    });

    it('should merge Tailwind classes correctly (avoiding duplicates)', () => {
      const result = cn('px-4 py-2', 'px-6');
      // twMerge should remove conflicting classes
      expect(result).toBe('py-2 px-6');
    });

    it('should handle arrays of class names', () => {
      const result = cn(['btn', 'btn-primary'], 'active');
      expect(result).toBe('btn btn-primary active');
    });

    it('should handle objects with boolean values', () => {
      const result = cn({
        btn: true,
        'btn-primary': true,
        'btn-disabled': false,
      });
      expect(result).toBe('btn btn-primary');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle complex nested structures', () => {
      const result = cn(
        'base-class',
        {
          active: true,
          disabled: false,
        },
        ['array-class-1', 'array-class-2'],
        null,
        'final-class'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('active');
      expect(result).not.toContain('disabled');
      expect(result).toContain('array-class-1');
      expect(result).toContain('array-class-2');
      expect(result).toContain('final-class');
    });

    it('should resolve Tailwind class conflicts correctly', () => {
      // Later class should override earlier class for same property
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should handle responsive Tailwind classes', () => {
      const result = cn('text-sm', 'md:text-lg', 'lg:text-xl');
      expect(result).toBe('text-sm md:text-lg lg:text-xl');
    });

    it('should handle variant classes', () => {
      const result = cn('hover:bg-blue-500', 'focus:bg-blue-600', 'active:bg-blue-700');
      expect(result).toBe('hover:bg-blue-500 focus:bg-blue-600 active:bg-blue-700');
    });

    it('should handle spacing classes with conflicts', () => {
      const result = cn('p-4', 'px-6', 'py-2');
      // px-6 should override p-4's horizontal padding
      // py-2 should override p-4's vertical padding
      expect(result).toBe('px-6 py-2');
    });

    it('should preserve important modifier', () => {
      const result = cn('text-red-500', '!text-blue-500');
      expect(result).toBe('!text-blue-500');
    });

    it('should handle arbitrary values', () => {
      const result = cn('bg-[#1da1f2]', 'text-[14px]');
      expect(result).toBe('bg-[#1da1f2] text-[14px]');
    });

    it('should handle custom variants with arbitrary values', () => {
      const result = cn('hover:bg-[#1da1f2]', 'focus:text-[14px]');
      expect(result).toBe('hover:bg-[#1da1f2] focus:text-[14px]');
    });

    it('should handle peer and group variants', () => {
      const result = cn('peer-checked:bg-blue-500', 'group-hover:text-red-500');
      expect(result).toBe('peer-checked:bg-blue-500 group-hover:text-red-500');
    });

    it('should handle data attributes', () => {
      const result = cn('data-[state=open]:bg-blue-500', 'data-[disabled]:opacity-50');
      expect(result).toBe('data-[state=open]:bg-blue-500 data-[disabled]:opacity-50');
    });

    it('should merge same utility with different variants', () => {
      const result = cn('bg-red-500', 'hover:bg-blue-500', 'focus:bg-green-500');
      expect(result).toBe('bg-red-500 hover:bg-blue-500 focus:bg-green-500');
    });

    it('should handle whitespace correctly', () => {
      const result = cn('  btn  ', '  btn-primary  ');
      expect(result).toBe('btn btn-primary');
    });

    it('should be composable', () => {
      const baseStyles = cn('btn', 'rounded');
      const primaryStyles = cn(baseStyles, 'bg-blue-500', 'text-white');
      expect(primaryStyles).toBe('btn rounded bg-blue-500 text-white');
    });
  });
});
