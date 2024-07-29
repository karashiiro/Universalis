using System;
using System.Collections.Generic;

namespace Universalis.DbAccess.Queries.MarketBoard;

public class SaleManyQuery
{
    public required ICollection<int> WorldIds { get; init; }

    public required ICollection<int> ItemIds { get; init; }

    public required int Count { get; init; }

    public DateTime? From { get; init; }

    public DateTime? To { get; init; }
}