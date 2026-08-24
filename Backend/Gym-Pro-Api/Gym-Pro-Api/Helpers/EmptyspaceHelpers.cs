namespace Apı.Helpers
{
    public static class EmptyspaceHelpers
    {
        public static string? Validate<T>(T Model)
        {
            if (Model is null)
            {
                return "Gonderilen Veriler Boş !";
            }
            var properties = typeof(T).GetProperties();
            foreach (var property in properties)
            {
                if (property.PropertyType != typeof(string))
                    continue;
                var value = property.GetValue(Model)?.ToString();
                if (string.IsNullOrWhiteSpace(value))
                {
                    return ($"{property.Name} alanı Boş Bırakılamaz");

                }
            }
            return null;
        }
    }
}