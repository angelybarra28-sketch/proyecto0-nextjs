-- Create storage bucket for supplier attachments (invoices, receipts)
insert into storage.buckets (id, name, public)
values ('proveedor-adjuntos', 'proveedor-adjuntos', true)
on conflict (id) do nothing;

-- Allow service_role (admin) full access
create policy "Admin full access to proveedor-adjuntos"
on storage.objects for all
using (bucket_id = 'proveedor-adjuntos')
with check (bucket_id = 'proveedor-adjuntos');
