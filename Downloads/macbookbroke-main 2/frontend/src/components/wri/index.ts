// WRI Component Exports
export { WriGaugeCard, getBand } from './WriGaugeCard';

// Types
export interface WriGaugeCardProps {
  score: number;
  band?: 'green' | 'yellow' | 'orange' | 'red';
  title?: string;
  showLegend?: boolean;
  subtext?: string;
  className?: string;
}
