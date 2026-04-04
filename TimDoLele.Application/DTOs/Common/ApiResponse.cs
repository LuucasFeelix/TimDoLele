using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T Data { get; set; }
        public string Message { get; set; }

        public static ApiResponse<T> Ok(T data, string message = "")
            => new ApiResponse<T>
            {
                Success = true,
                Data = data,
                Message = message
            };

        public static ApiResponse<T> Fail(string message)
            => new ApiResponse<T>
            {
                Success = false,
                Message = message
            };

    }
}
