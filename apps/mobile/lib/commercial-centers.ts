// Explicit centers can be registered before their first reviewed branch is added.
export const registeredCommercialCenters = [
  {
    name: 'Ibiza 122',
    aliases: ['Ibiza 122 Food Mall', 'Ibiza122'],
    neighborhood: 'Pance',
    city: 'Cali',
    address: 'Calle 16A #122-30',
    source: 'https://www.instagram.com/ibiza122foodmall/',
  },
];

export function findRegisteredCommercialCenter(value: string) {
  const normalize = (text: string) => text.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  const normalized = normalize(value);
  return registeredCommercialCenters.find(center =>
    [center.name, ...center.aliases].some(label => normalize(label) === normalized),
  );
}
