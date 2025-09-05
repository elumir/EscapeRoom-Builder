import React, { useState, ReactNode } from 'react';
import Icon from './Icon';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  headerContent?: ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = false, headerContent }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left font-semibold text-slate-700 dark:text-slate-300"
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {headerContent}
        </div>
        <Icon as="chevron-down" className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion;