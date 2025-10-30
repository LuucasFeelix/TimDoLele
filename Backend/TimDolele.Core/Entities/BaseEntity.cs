namespace TimDolele.Core.Entities
{
    public class BaseEntity
    {
        public Guid Id { get; protected set; }

        protected BaseEntity() => Id = Guid.NewGuid();

    }
}
