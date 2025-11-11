import React from 'react';
import './Button.css';

const Button = ({ as: Component = 'button', children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const classes = `app-btn app-btn--${variant} app-btn--${size} ${className}`.trim();

  // Simplify condition and avoid mixing || and && which ESLint flags —
  // treat the literal 'button' tag as the native button case.
  if (Component === 'button') {
    return (
      <button className={classes} {...props}>
        {children}
      </button>
    );
  }

  const Comp = Component;
  return (
    <Comp className={classes} {...props}>
      {children}
    </Comp>
  );
};

export default Button;
