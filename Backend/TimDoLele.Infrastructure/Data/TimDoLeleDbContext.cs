using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;

namespace TimDoLele.Infrastructure.Data
{
    public class TimDoLeleDbContext : DbContext
    {
        public TimDoLeleDbContext(DbContextOptions<TimDoLeleDbContext> options)
            : base(options)
        {
        }

        public DbSet<Pedido> Pedidos => Set<Pedido>();
        public DbSet<Cliente> Clientes => Set<Cliente>();
        public DbSet<ItemPedido> ItensPedido => Set<ItemPedido>();
        public DbSet<Adicional> Adicionais => Set<Adicional>();
        public DbSet<Pagamento> Pagamentos => Set<Pagamento>();
        public DbSet<Categoria> Categorias => Set<Categoria>();
        public DbSet<Produto> Produtos => Set<Produto>();
        public DbSet <ProdutoAdicional> ProdutosAdicionais => Set<ProdutoAdicional>();
        public DbSet<ItemPedidoAdicional> ItensPedidoAdicionais => Set<ItemPedidoAdicional>();
        public DbSet<Usuarios> Usuarios { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
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

            base.OnModelCreating(modelBuilder); 
        }
    }
}
