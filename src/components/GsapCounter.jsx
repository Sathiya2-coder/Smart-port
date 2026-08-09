import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export default function GsapCounter({
  value = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  duration = 0.8
}) {
  const [displayVal, setDisplayVal] = useState(value);
  const countObjRef = useRef({ val: value });
  const prevValRef = useRef(value);

  useEffect(() => {
    // If value hasn't changed, skip tweening
    if (prevValRef.current === value) return;

    const startVal = countObjRef.current.val;
    const targetVal = typeof value === 'number' ? value : parseFloat(value) || 0;

    const tween = gsap.to(countObjRef.current, {
      val: targetVal,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayVal(countObjRef.current.val);
      }
    });

    prevValRef.current = value;

    return () => {
      tween.kill();
    };
  }, [value, duration]);

  const formattedValue = typeof displayVal === 'number'
    ? displayVal.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
    : displayVal;

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}
