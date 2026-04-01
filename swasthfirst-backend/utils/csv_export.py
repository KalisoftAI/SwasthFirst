"""
CSV export utility for order data.

Provides helper functions to export data to CSV format for admin reports.
"""

import io
import csv
from typing import List
from datetime import datetime

from models import Order, Customer


def orders_to_csv(orders: List[Order], include_customer: bool = True) -> str:
    """
    Convert a list of orders to CSV format.
    
    Args:
        orders: List of Order objects (with customer relationship loaded)
        include_customer: Whether to include customer details
        
    Returns:
        CSV string content
    """
    output = io.StringIO()
    
    # Define CSV headers
    if include_customer:
        fieldnames = [
            'Order ID', 'Order Code', 'Customer Name', 'Phone',
            'Items', 'Total (₹)', 'Status', 'Created At', 'Completed At'
        ]
    else:
        fieldnames = [
            'Order ID', 'Order Code', 'Items', 'Total (₹)',
            'Status', 'Created At', 'Completed At'
        ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    # Write order rows
    for order in orders:
        # Format items as "2x Amla Juice, 1x Karela Juice"
        items_str = ", ".join([
            f"{item['quantity']}x {item['name']}"
            for item in order.items
        ])
        
        row = {
            'Order ID': str(order.id),
            'Order Code': order.order_code,
            'Items': items_str,
            'Total (₹)': order.total_amount,
            'Status': order.status.value,
            'Created At': order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'Completed At': order.completed_at.strftime('%Y-%m-%d %H:%M:%S') if order.completed_at else ''
        }
        
        if include_customer:
            row['Customer Name'] = order.customer.name
            row['Phone'] = order.customer.phone
        
        writer.writerow(row)
    
    return output.getvalue()


def customers_to_csv(
    customers: List[Customer],
    include_stats: bool = False,
    stats_data: dict = None
) -> str:
    """
    Convert a list of customers to CSV format.
    
    Args:
        customers: List of Customer objects
        include_stats: Whether to include order statistics
        stats_data: Dictionary mapping customer_id to stats dict
        
    Returns:
        CSV string content
    """
    output = io.StringIO()
    
    # Define CSV headers
    if include_stats:
        fieldnames = [
            'Customer ID', 'Name', 'Phone', 'Health Goal',
            'Order Count', 'Total Spent (₹)', 'Last Order',
            'Joined Date', 'Is Active'
        ]
    else:
        fieldnames = [
            'Customer ID', 'Name', 'Phone', 'Health Goal',
            'Joined Date', 'Is Active'
        ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    # Write customer rows
    for customer in customers:
        row = {
            'Customer ID': str(customer.id),
            'Name': customer.name,
            'Phone': customer.phone,
            'Health Goal': customer.health_goal or '',
            'Joined Date': customer.created_at.strftime('%Y-%m-%d'),
            'Is Active': 'Yes' if customer.is_active else 'No'
        }
        
        if include_stats and stats_data and str(customer.id) in stats_data:
            stats = stats_data[str(customer.id)]
            row['Order Count'] = stats.get('order_count', 0)
            row['Total Spent (₹)'] = stats.get('total_spent', 0)
            last_order = stats.get('last_order_at')
            row['Last Order'] = last_order.strftime('%Y-%m-%d') if last_order else 'Never'
        elif include_stats:
            row['Order Count'] = 0
            row['Total Spent (₹)'] = 0
            row['Last Order'] = 'Never'
        
        writer.writerow(row)
    
    return output.getvalue()


def daily_summary_to_csv(
    date: datetime.date,
    total_orders: int,
    total_revenue: int,
    top_items: List[dict],
    hourly_distribution: dict
) -> str:
    """
    Create a daily summary CSV report.
    
    Args:
        date: Date of the summary
        total_orders: Total number of orders
        total_revenue: Total revenue in rupees
        top_items: List of top items with counts
        hourly_distribution: Orders by hour
        
    Returns:
        CSV string content with multiple sections
    """
    output = io.StringIO()
    
    # Summary section
    output.write(f"Daily Summary Report - {date.strftime('%Y-%m-%d')}\n")
    output.write(f"Total Orders,{total_orders}\n")
    output.write(f"Total Revenue (₹),{total_revenue}\n")
    output.write(f"Average Order Value (₹),{total_revenue // total_orders if total_orders > 0 else 0}\n")
    output.write("\n")
    
    # Top items section
    output.write("Top Selling Items\n")
    output.write("Item Name,Quantity Sold,Revenue (₹)\n")
    for item in top_items:
        output.write(f"{item['name']},{item['count']},{item['revenue']}\n")
    output.write("\n")
    
    # Hourly distribution section
    output.write("Orders by Hour\n")
    output.write("Hour,Order Count\n")
    for hour in range(24):
        count = hourly_distribution.get(hour, 0)
        if count > 0:  # Only include hours with orders
            output.write(f"{hour:02d}:00,{count}\n")
    
    return output.getvalue()


# TODO: Add Excel (XLSX) export support using openpyxl
# TODO: Add PDF report generation for professional reports
# TODO: Add chart/graph generation for visual analytics
# TODO: Add scheduled report email functionality
