-- Corrige o erro "permission denied for table feira_fotos".
-- O RLS continua ativo: só administradores podem inserir e excluir.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.feira_fotos TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.feira_fotos TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_admin_feira() TO authenticated;
ALTER TABLE public.feira_fotos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feira_fotos' AND policyname='feira_fotos_leitura_publica') THEN
    CREATE POLICY feira_fotos_leitura_publica ON public.feira_fotos FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feira_fotos' AND policyname='feira_fotos_inserir_admin') THEN
    CREATE POLICY feira_fotos_inserir_admin ON public.feira_fotos FOR INSERT TO authenticated WITH CHECK (public.e_admin_feira());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feira_fotos' AND policyname='feira_fotos_excluir_admin') THEN
    CREATE POLICY feira_fotos_excluir_admin ON public.feira_fotos FOR DELETE TO authenticated USING (public.e_admin_feira());
  END IF;
END $$;
