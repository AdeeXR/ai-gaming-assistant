import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none data-[state=open]:bg-slate-100',
  {
    variants: {
      variant: {
        default: 'bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        outline: 'border border-gray-600 bg-transparent hover:bg-gray-700 hover:text-white focus-visible:ring-gray-500',
        secondary: 'bg-gray-700 text-gray-100 hover:bg-gray-600 focus-visible:ring-gray-500',
        ghost: 'hover:bg-gray-700 hover:text-white focus-visible:ring-gray-500',
        link: 'text-teal-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={twMerge(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// >>>>>> THIS IS THE CRUCIAL EXPORT STATEMENT <<<<<<
// It makes the 'Button' component and 'buttonVariants' available for import
export { Button, buttonVariants };
