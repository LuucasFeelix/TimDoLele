using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;

namespace TimDoLele.Infrastructure.Data
{
    public class TimDoLeleDbContext : DbContext
    {
        public TimDoLeleDbContext(
            DbContextOptions<TimDoLeleDbContext> options)
            : base(options)
        {
        }

        public DbSet<Pedido> Pedidos =>
            Set<Pedido>();

        public DbSet<Cliente> Clientes =>
            Set<Cliente>();

        public DbSet<ItemPedido> ItensPedido =>
            Set<ItemPedido>();

        public DbSet<Adicional> Adicionais =>
            Set<Adicional>();

        public DbSet<Pagamento> Pagamentos =>
            Set<Pagamento>();

        public DbSet<Categoria> Categorias =>
            Set<Categoria>();

        public DbSet<Produto> Produtos =>
            Set<Produto>();

        public DbSet<ProdutoAdicional> ProdutosAdicionais =>
            Set<ProdutoAdicional>();

        public DbSet<ItemPedidoAdicional> ItensPedidoAdicionais =>
            Set<ItemPedidoAdicional>();

        public DbSet<Usuarios> Usuarios =>
            Set<Usuarios>();

        public DbSet<ConfiguracaoLoja> ConfiguracoesLoja =>
            Set<ConfiguracaoLoja>();

        public DbSet<HorarioFuncionamento> HorariosFuncionamento =>
            Set<HorarioFuncionamento>();

        public DbSet<DataEspecial> DatasEspeciais =>
            Set<DataEspecial>();

        protected override void OnModelCreating(
            ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Cliente>()
                .OwnsOne(c => c.Endereco);

            modelBuilder.Entity<Produto>()
                .HasOne(p => p.Categoria)
                .WithMany(c => c.Produtos)
                .HasForeignKey(p => p.CategoriaId);

            modelBuilder.Entity<ProdutoAdicional>()
                .HasOne(pa => pa.Produto)
                .WithMany(p => p.Adicionais)
                .HasForeignKey(pa => pa.ProdutoId);

            modelBuilder.Entity<ProdutoAdicional>()
                .HasOne(pa => pa.Adicional)
                .WithMany(a => a.ProdutosAdicionais)
                .HasForeignKey(pa => pa.AdicionalId);

            modelBuilder.Entity<ItemPedidoAdicional>()
                .HasOne(ipa => ipa.ItemPedido)
                .WithMany(ip => ip.Adicionais)
                .HasForeignKey(ipa => ipa.ItemPedidoId);

            modelBuilder.Entity<ItemPedidoAdicional>()
                .HasOne(ipa => ipa.Adicional)
                .WithMany()
                .HasForeignKey(ipa => ipa.AdicionalId);

            modelBuilder.Entity<Pedido>()
                .Property(p => p.StatusImpressao)
                .HasConversion<int>();

            modelBuilder.Entity<ConfiguracaoLoja>()
                .Property(c => c.TaxaEntregaPadrao)
                .HasPrecision(10, 2);

            modelBuilder.Entity<HorarioFuncionamento>()
                .Property(h => h.DiaSemana)
                .HasConversion<int>();

            modelBuilder.Entity<DataEspecial>()
                .Property(d => d.Tipo)
                .HasConversion<int>();

            modelBuilder.Entity<DataEspecial>()
                .HasIndex(d => d.Data);

            base.OnModelCreating(modelBuilder);
        }
    }
}