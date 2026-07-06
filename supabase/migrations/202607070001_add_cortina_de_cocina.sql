-- Rename CORTINAS > Cocina → Cortinas de Cocina
update categories set name = 'Cortinas de Cocina'
where slug = 'cortina-cocina';

-- Rename COCINA > Cortina de Cocina → Cortinas de Cocina (consistente)
update categories set name = 'Cortinas de Cocina'
where slug = 'cortina-de-cocina';

