import { ContactInfo, NavLink } from './types';

export const contactInfo: ContactInfo = {
  phone: '+54 911 28455650',
  email: 'contacto@tusabanas.com',
  whatsapp: '+5491158056418',
  address: 'Tu localidad, Argentina'
};

export const navLinks: NavLink[] = [
  {
    label: 'Electrodomésticos y Artículos',
    href: '#electrodomesticos',
    submenu: [
      { label: 'TV', href: '#tv' },
      { label: 'Aire', href: '#aire' },
      { label: 'Artículos de cocina', href: '#cocina' },
      { label: 'Ventiladores', href: '#ventiladores' },
      { label: 'Bicicletas', href: '#biciletas' },
      { label: 'Consolas', href: '#consolas' },
      { label: 'Otros', href: '#otros' }
    ]
  },
  {
    label: 'Blanquería',
    href: '#blanqueria',
    submenu: [
      { label: 'Sábanas', href: '#sabanas' },
      { label: 'Frazadas', href: '#frazadas' },
      { label: 'Cortinas', href: '#cortinas' },
      { label: 'Toallas', href: '#toallas' },
      { label: 'Otros', href: '#otros' }
    ]
  }
];

export const paymentMethods = [
  { name: 'VISA', icon: '💳' },
  { name: 'Mastercard', icon: '💳' },
  { name: 'American Express', icon: '💳' }
];

export const socialLinks = [
  { name: 'Instagram', icon: '📘', url: '#' },
  { name: 'Facebook', icon: '📱', url: '#' }
];
