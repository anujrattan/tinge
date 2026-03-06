/**
 * Icon Components
 * 
 * This file re-exports icons from lucide-react with our naming convention
 * to maintain backward compatibility across the codebase.
 * 
 * Most icons are now sourced from lucide-react for:
 * - Smaller bundle size (tree-shakeable)
 * - Consistent design
 * - Easy maintenance
 * - 1000+ icons available
 * 
 * Only StarIcon remains custom due to its special 'filled' prop functionality.
 */

import React from 'react';
import {
  ShoppingBag,
  Image,
  X,
  Link,
  LogOut,
  Settings,
  Edit,
  Search,
  User,
  Heart,
  Recycle,
  ArrowRight,
  ArrowLeft,
  Target,
  Droplet,
  CloudUpload,
  LayoutTemplate,
  Box as LucideBox,
  Instagram,
  Twitter,
  Facebook,
  Mail,
  Zap,
  Flame,
  Wand2,
  Tag,
  Ruler,
  Truck,
  Undo2,
  HelpCircle,
  Send,
  Gift,
  Sparkles,
  BarChart,
  Award,
  TrendingUp,
  Bell,
  Lightbulb,
  Smile,
  Rocket,
  MessageCircle,
  Trash2,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Package,
  Sun,
  Moon,
  DollarSign,
  Receipt,
  CheckCircle,
  RefreshCw,
  Download,
  Calendar,
  CreditCard,
  MapPin,
  Shield,
  Smartphone,
  Wallet,
  Banknote,
} from 'lucide-react';

// Re-export all Lucide icons with our naming convention
export const ShoppingBagIcon = ShoppingBag;
export const ImageIcon = Image;
export const XIcon = X;
export const LinkIcon = Link;
export const LogOutIcon = LogOut;
export const SettingsIcon = Settings;
export const EditIcon = Edit;
export const SearchIcon = Search;
export const UserIcon = User;
export const HeartIcon = Heart;
export const RecycleIcon = Recycle;
export const ArrowRightIcon = ArrowRight;
export const ArrowLeftIcon = ArrowLeft;
export const TargetIcon = Target;
export const DropletIcon = Droplet;
export const UploadCloudIcon = CloudUpload;
export const LayoutTemplateIcon = LayoutTemplate;
export const CubeIcon = LucideBox; // Mapped from Box
export const InstagramIcon = Instagram;
export const TwitterIcon = Twitter;
export const FacebookIcon = Facebook;
export const MailIcon = Mail;
export const ZapIcon = Zap;
export const FlameIcon = Flame;
export const Wand2Icon = Wand2;
export const TagIcon = Tag;
export const RulerIcon = Ruler;
export const TruckIcon = Truck;
export const Undo2Icon = Undo2;
export const HelpCircleIcon = HelpCircle;
export const SendIcon = Send;
export const GiftIcon = Gift;
export const SparklesIcon = Sparkles;
export const BarChartIcon = BarChart;
export const AwardIcon = Award;
export const TrendingUpIcon = TrendingUp;
export const BellIcon = Bell;
export const LightbulbIcon = Lightbulb;
export const SmileIcon = Smile;
export const RocketIcon = Rocket;
export const MessageCircleIcon = MessageCircle;
export const TrashIcon = Trash2;
export const PlusIcon = Plus;
export const MinusIcon = Minus;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const ClockIcon = Clock;
export const GlobeIcon = Globe;
export const PackageIcon = Package;
export const SaleTagIcon = Tag; // Same as TagIcon
export const SunIcon = Sun;
export const MoonIcon = Moon;
export const DollarSignIcon = DollarSign;
export const ReceiptIcon = Receipt;
export const BoxIcon = LucideBox;
export const CheckCircleIcon = CheckCircle;
export const RefreshCwIcon = RefreshCw;
export const DownloadIcon = Download;
export const CalendarIcon = Calendar;
export const CreditCardIcon = CreditCard;
export const MapPinIcon = MapPin;
export const ShieldIcon = Shield;
export const SmartphoneIcon = Smartphone;
export const WalletIcon = Wallet;
export const BanknoteIcon = Banknote;

/**
 * Custom StarIcon Component
 * 
 * This icon remains custom because it has a special 'filled' prop
 * that controls whether the star is filled or outlined.
 * Lucide's Star icon doesn't support this dynamic fill behavior.
 */
export const StarIcon: React.FC<{ className?: string; key?: any; filled?: boolean }> = ({ 
  className, 
  filled = true 
}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill={filled ? "currentColor" : "none"} 
    stroke="currentColor" 
    strokeWidth={1.5} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
