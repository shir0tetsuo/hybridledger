import streamlit as st
import hashlib
import pandas as pd
import sqlite3
import matplotlib
import matplotlib.pyplot
import seaborn as sns
from datetime import datetime

# Database
dbFile = '/home/inpw/Desktop/hybridledger/module/database.sqlite'

conn = sqlite3.connect(dbFile)

class ServerHL:

    def __init__(
            self,
            index       :int, # 0+
            position    :str, # a4,b3
            ownership   :str, # uuid (owner)
            blockType   :int, # 1 GEN 2 MINT 3 TX 4 ACQ 5 LCK 6 OBF
            data        :str, # {text}
            previousHash:str, # SHA256
            minted      :int, # num. minted
            nonce       :int, # num. iter
            timestamp   :int, # unix timestamp
            uuid        :str  # uuid (object)
        ):
        
        self.index          = index
        self.position       = position
        self.ownership      = ownership
        self.blockType      = blockType
        self.data           = data
        self.previousHash   = previousHash
        self.minted         = minted
        self.nonce          = nonce
        self.timestamp      = timestamp
        self.uuid           = uuid

        pass

class ServerHLChain:

    def __init__(
            self, 
            pos_value:str,                  # position hex, monetary value
            pos_payment_stacks:list[str],   # position hex, payment status
            label:str = 'Unknown',
            frequency:str = 'Monthly'
        ):
        self.label = label
        #'''label of bill'''
        self.pos_value = pos_value
        #'''monetary value chain position hex'''

        self.frequency = frequency

        self.pos_payment_stacks = pos_payment_stacks
        #'''payment status chain position hex'''
        self.persons_paying = len(pos_payment_stacks)

        self.payments_chain = []
        #'''payment status chain'''
        self.dues_chains = { position : [] for position in pos_payment_stacks }
        #'''value chain'''
        pass

    def read_database(self):
        '''Read the Database file with pandas.'''
        # payment chain (payment status)
        p_df = pd.read_sql_query(f"SELECT * FROM 'HybridLedgers' WHERE position = '{self.pos_value}'", conn)
        self.payments_chain = []
        for i in range(len(p_df)):
            self.payments_chain.append(ServerHL(
                index       = p_df.iloc[i]['index'],
                position    = p_df.iloc[i]['position'],
                ownership   = p_df.iloc[i]['ownership'],
                blockType   = p_df.iloc[i]['blockType'],
                data        = p_df.iloc[i]['data'],
                previousHash= p_df.iloc[i]['previousHash'],
                minted      = p_df.iloc[i]['minted'],
                nonce       = p_df.iloc[i]['nonce'],
                timestamp   = p_df.iloc[i]['timestamp'],
                uuid        = p_df.iloc[i]['uuid']
            ))
        # Ensure chain is in order of index.
        self.payments_chain.sort(key=lambda x: x.index)

        # Do the same for each position:list in the dues chain
        for position in self.pos_payment_stacks:
            # value chain (payment status)
            v_df = pd.read_sql_query(f"SELECT * FROM 'HybridLedgers' WHERE position = '{position}'", conn)
            self.dues_chains[position] = []
            for i in range(len(v_df)):
                self.dues_chains[position].append(ServerHL(
                    index       = v_df.iloc[i]['index'],
                    position    = v_df.iloc[i]['position'],
                    ownership   = v_df.iloc[i]['ownership'],
                    blockType   = v_df.iloc[i]['blockType'],
                    data        = v_df.iloc[i]['data'],
                    previousHash= v_df.iloc[i]['previousHash'],
                    minted      = v_df.iloc[i]['minted'],
                    nonce       = v_df.iloc[i]['nonce'],
                    timestamp   = v_df.iloc[i]['timestamp'],
                    uuid        = v_df.iloc[i]['uuid']
                ))
            # Ensure chain is in order of index.
            self.dues_chains[position].sort(key=lambda x: x.index)
        return

st.write('''# 💵️ Bill Review''')

SharedBills = [
    ServerHLChain(pos_value='-a8,-c2', pos_payment_stacks=['-a8,-c4','-a8,-c5'], label='Hydro One Electricity'),
    ServerHLChain(pos_value='-a7,-c2', pos_payment_stacks=['-a7,-c4','-a7,-c5'], label='Water/Waste Utilities', frequency='Bi-monthly'),
    ServerHLChain(pos_value='-a6,-c2', pos_payment_stacks=['-a6,-c4','-a6,-c5'], label='Bell Internet'),
    ServerHLChain(pos_value='-a5,-c2', pos_payment_stacks=['-a5,-c4','-a5,-c5'], label='Enbridge Gas'),
    ServerHLChain(pos_value='-a4,-c2', pos_payment_stacks=['-a4,-c4','-a4,-c5'], label='Rental'),
    ServerHLChain(pos_value='-a8,-c7', pos_payment_stacks=['-a8,-c8'], label='Weed', frequency='Biweekly'),
    ServerHLChain(pos_value='-a7,-c7', pos_payment_stacks=['-a7,-c8'], label='RV Lot Rental'),
    ServerHLChain(pos_value='-a6,-c7', pos_payment_stacks=['-a6,-c8'], label='TD RV Loan', frequency='Weekly'),
    ServerHLChain(pos_value='-a5,-c7', pos_payment_stacks=['-a5,-c8'], label='Scotiabank Truck Loan', frequency='Biweekly'),
    ServerHLChain(pos_value='-a4,-c7', pos_payment_stacks=['-a4,-c8'], label='BMO Credit Card'),
    ServerHLChain(pos_value='-a3,-c7', pos_payment_stacks=['-a3,-c8'], label='BMO Line of Credit', frequency='Biweekly'),
    ServerHLChain(pos_value='-a2,-c7', pos_payment_stacks=['-a2,-c8'], label='Koodo Phones')

]

Payees = {
    'Ryan & Ara' : ['-a8,-c5', '-a7,-c5', '-a6,-c5', '-a5,-c5', '-a4,-c5', '-a8,-c8', '-a7,-c8', '-a6,-c8', '-a5,-c8', '-a4,-c8', '-a3,-c8', '-a2,-c8', '-a1,-c8'],
    'Ellie & Heather' : ['-a8,-c4', '-a7,-c4', '-a6,-c4', '-a5,-c4', '-a4,-c4']
}

def get_payee_name_by_position(position):
    for payee, positions in Payees.items():
        if position in positions:
            return payee
    return 'Unknown'

# Create a dropdown to select a bill or an option to view all of them at once
bill_selection = st.selectbox(
    "Select a bill:",
    ['All Bills'] + [bill.label for bill in SharedBills],
)

######################
#   INDIVIDUAL BILL  #
######################

if (bill_selection != 'All Bills'):
    with st.spinner('Loading Bill...'):

        for bill in SharedBills:
            if bill.label == bill_selection:
                
                bill.read_database()
                st.write(f'## {bill.label} ({bill.frequency})')

                responsible = ', '.join([get_payee_name_by_position(position) for position in bill.dues_chains.keys()])

                st.write(f'Responsibility: {responsible}')

                payment_floats = bill.payments_chain
                last_pay_float = payment_floats[-1]

                bill_name = bill.label
                bill_values = [hl.data for hl in bill.payments_chain if 'Genesis' not in hl.data]
                bill_history = [datetime.fromtimestamp(hl.timestamp/1000).strftime('%Y-%m-%d') for hl in bill.payments_chain if 'Genesis' not in hl.data]

                # Calculate a list of deltas; +/- from the last value
                bill_deltas = [0]
                for i in range(1, len(bill_values)):
                    bill_deltas.append(float(bill_values[i]) - float(bill_values[i-1]))

                # Create a table to show the bill history
                with st.expander(f'{bill_name} History', icon='⏳️'):

                    st.table(pd.DataFrame({
                        'Issued': bill_history,
                        'Cost': bill_values,
                        'Delta': bill_deltas
                    }))

                    # Create a chart to show the bill deltas
                    matplotlib.pyplot.figure(figsize=(10, 5))
                    matplotlib.pyplot.xlabel('Date')
                    matplotlib.pyplot.ylabel('Delta ($)')
                    matplotlib.pyplot.title(f'{bill_name} Price Delta')
                    matplotlib.pyplot.xticks(rotation=45)
                    matplotlib.pyplot.plot(bill_history, bill_deltas)
                    # display horizontal line from zero
                    matplotlib.pyplot.axhline(y=0, color='gray', linestyle='--')
                    # text overlay the value of the bill in that date
                    for i in range(len(bill_history)):
                        matplotlib.pyplot.text(bill_history[i], bill_deltas[i], bill_values[i], ha='center', va='bottom')
                    st.pyplot(matplotlib.pyplot.gcf())

                    
                    matplotlib.pyplot.figure(figsize=(10,5))
                    matplotlib.pyplot.xlabel('Date')
                    matplotlib.pyplot.ylabel('Cost ($)')
                    matplotlib.pyplot.title(f'{bill_name} Cost Over Time')
                    # generate the cost of the bill by the date and make sure the labels on the left are the value
                    # the cost on the third item is lower than the second ...

                    cost_data = pd.DataFrame({
                        'Date': bill_history,
                        'Values': [float(f) for f in bill_values],
                        'Delta': bill_deltas
                    })

                    sns.lineplot(x='Date', y='Values', data=cost_data, color='gray')
                    matplotlib.pyplot.xticks(rotation=45)
                    # Show the delta below each point along with a white label background
                    for i in range(len(cost_data)):
                        matplotlib.pyplot.text(cost_data['Date'][i], cost_data['Values'][i], f"${cost_data['Values'][i]} | d=\${cost_data['Delta'][i]:.2f} ", ha='center', va='bottom')
                    
                    # Show line for each y
                    for i in range(len(cost_data)):
                        matplotlib.pyplot.axhline(y=cost_data['Values'][i], color='gray', linestyle='--')
                    # Show the date on the x-axis
                    matplotlib.pyplot.xticks(rotation=45)
                    st.pyplot(matplotlib.pyplot.gcf())

                    # Create a heatmap to show the bill deltas
                    heatmap_data = pd.DataFrame({
                        'Date': bill_history,
                        'Delta': bill_deltas
                    })

                    # Setting Date as the index for a clean heatmap display
                    heatmap_data['Date'] = pd.to_datetime(heatmap_data['Date'])
                    heatmap_data = heatmap_data.set_index('Date')

                    # Reshape the data if there are multiple bills over time (otherwise skip pivot)
                    heatmap_data = heatmap_data.T  # Transpose to have dates as columns

                    # Plot the heatmap
                    matplotlib.pyplot.figure(figsize=(10, 2))  # Adjust height for better readability
                    sns.heatmap(heatmap_data, annot=True, fmt=".1f", cmap="seismic", center=0, cbar_kws={'label': 'Delta ($)'})
                    matplotlib.pyplot.title(f'{bill_name} Delta Changes Over Time')
                    matplotlib.pyplot.xlabel('Date')
                    matplotlib.pyplot.ylabel('Delta ($)')

                    # format the date labels to YYYY-MM-DD
                    matplotlib.pyplot.xticks(rotation=45)

                    matplotlib.pyplot.xticks(ticks=range(len(bill_history)),labels=[str(i) for i in bill_history])
                    # move tick to center of cell
                    matplotlib.pyplot.tick_params(axis='x', which='major', pad=10)

                    # Display heatmap in Streamlit
                    st.pyplot(matplotlib.pyplot.gcf())

                    matplotlib.pyplot.close()




                # Individuals Graphs

                for position, payment_chain in bill.dues_chains.items():
                    payee_name = get_payee_name_by_position(position)
                    dates = [datetime.fromtimestamp(HL.timestamp/1000) for HL in payment_chain if 'ok' in HL.data.lower()]

                    with st.expander(f'{payee_name}', expanded=True, icon='🪪️'):
                        #st.markdown('---')

                        # Create a list of the last 6 months
                        months = [datetime.now().replace(month=i).strftime('%b') for i in range(datetime.now().month, datetime.now().month - 6, -1)]

                        month_has_payment = {month : False for month in months}

                        # For each datetime object, check if there was a payment for a month in the past 6 months
                        for date in dates:
                            if date.month in [i for i in range(datetime.now().month, datetime.now().month - 6, -1)]:
                                month_has_payment[date.strftime('%b')] = True

                        # Create a list of 1s and 0s for each month
                        payment_history = [1 if month_has_payment[month] else 0 for month in months]

                        # Plot the payment history
                        #matplotlib.pyplot.bar(months, payment_history)
                        #st.pyplot(matplotlib.pyplot.gcf())

                        payment_info_chain = [HL for HL in payment_chain if HL.timestamp/1000 > datetime.now().replace(month=datetime.now().month - 7).timestamp()]
                        # attempt to get the HL from payment_floats that came before each HL in payment_chain_info
                        #payment_float_chain = [HL for HL in payment_floats if HL.timestamp/1000 < payment_info_chain[0].timestamp/1000]

                        payment_float_chain = []
                        for iHL in payment_info_chain:
                            # Attempt to get the HL right before the iHL timestamp.
                            corresponding_vHL = None
                            for vHL in payment_floats:
                                if vHL.timestamp < iHL.timestamp:
                                    corresponding_vHL = vHL

                            payment_float_chain.append(corresponding_vHL)


                        # if there is nothing before in the payment_chain_info, make sure they are of the same length
                        if len(payment_info_chain) > len(payment_float_chain):
                            payment_float_chain = payment_float_chain + [payment_float_chain[-1]] * (len(payment_info_chain) - len(payment_float_chain))

                        payment_chain_info_df = pd.DataFrame({
                            'OK': [(True if 'ok' in HL.data.lower() else False) for HL in payment_info_chain],
                            'Data': [(HL.data if 'Genesis' not in HL.data else 'Genesis') for HL in payment_info_chain],
                            'Timestamp': [datetime.fromtimestamp(HL.timestamp/1000).strftime('%Y-%m-%d') for HL in payment_info_chain],
                            'Bill Value': [(str(float(HL.data)/len(bill.dues_chains))+f' ({HL.data})' if 'Genesis' not in HL.data else 'Genesis') for HL in payment_float_chain],
                            'Date Issued': [datetime.fromtimestamp(HL.timestamp/1000).strftime('%Y-%m-%d') for HL in payment_float_chain]
                            # Get from payment_floats the HL that has the timestamp that is right before the payment_chain_info timestamp
                            #'Previous Payment': [datetime.fromtimestamp(payment_floats[i].timestamp/1000).strftime('%Y-%m-%d') for i in range(len(payment_chain_info))],
                        })
                        #{'column':[row_data,row_data,...]}
                        last_bill_issue_date = datetime.fromtimestamp(last_pay_float.timestamp/1000).strftime('%Y-%m-%d')
                        last_ok_for_bill = datetime.fromtimestamp(payment_info_chain[-1].timestamp/1000).strftime('%Y-%m-%d')

                        # get datetime object
                        dt_last_bill_ok = datetime.strptime(last_ok_for_bill, '%Y-%m-%d')
                        dt_last_bill_issue = datetime.strptime(last_bill_issue_date, '%Y-%m-%d')

                        st.write(f'{("👍️ Payment Received" if (dt_last_bill_ok > dt_last_bill_issue) else "Payment Due")}')
                        st.write(f'### Last Bill Issued: `{last_bill_issue_date}` | Last Payment: `{last_ok_for_bill}`')

                        st.write(f'#### {payee_name} Payment History')
                        st.table(payment_chain_info_df)
                    

#################
#   ALL BILLS   #
#################   
         
else:

    with st.expander('Overview', icon='💹'):

        frequencies = {
            'Bi-monthly': 2,
            'Monthly': 1,
            'Biweekly': 0.5,
            'Weekly': 0.25
        }

        bill_frames = []
        bill_names = []
        bill_last_values = []
        bill_num_responsible = []
        bill_freq = []
        for bill in SharedBills:
            bill.read_database()
            #if 'rental' not in bill.label.lower():
            # Add the bill label, value, and date to a dataframe,
            # then create a graph:
            # Y = The cost $
            # X = The date
            # Color each line differently based on the bill label and display a legend
            # Make sure the dates are in order
            bill.read_database()
            bill_frames.append(pd.DataFrame({
                'Date': [datetime.fromtimestamp(hl.timestamp/1000).strftime('%Y-%m-%d') for hl in bill.payments_chain if 'Genesis' not in hl.data],
                'Value': [float(hl.data) for hl in bill.payments_chain if 'Genesis' not in hl.data],
                'Bill': [bill.label] * len([hl for hl in bill.payments_chain if 'Genesis' not in hl.data])
            }))
            bill_freq.append(frequencies[bill.frequency])
            bill_num_responsible.append(len(bill.dues_chains))
            bill_names.append(f'{bill.label} {bill.frequency}')
            bill_last_values.append([float(hl.data) for hl in bill.payments_chain if 'Genesis' not in hl.data][-1])

        bill_ov = pd.DataFrame({
            'Bill': bill_names,
            'Last Value': bill_last_values,
            '# Responsible': bill_num_responsible,
            'Appx. Mon. Pay / Responsible': [(i / bill_num_responsible[idx])/bill_freq[idx] for idx,i in list(enumerate(bill_last_values))],
            'Frequency': bill_freq
        })

        bttn_col1, bttn_col2 = st.columns(2)

        with bttn_col1:
            frequency_select = st.selectbox('Table Filter by Frequency', [None] + [f for f in frequencies.keys()])
            num_responsible_select = st.selectbox('Table Filter by # Responsible', [None, 1, 2])

        bill_filtered_ov = bill_ov.copy()

        if frequency_select:
            bill_filtered_ov = bill_filtered_ov[bill_filtered_ov['Frequency'] == frequencies[frequency_select]]
        
        if num_responsible_select:
            bill_filtered_ov = bill_filtered_ov[bill_filtered_ov['# Responsible'] == num_responsible_select]
        
        #bill_filtered_ov[bill_filtered_ov['Frequency'] == frequency_select]

        #st.write(f'Appx. Mon. Pay / Responsible (Sum) = `${sum([(i / bill_num_responsible[idx])/bill_freq[idx] for idx,i in list(enumerate(bill_last_values))]):.2f}`')

        # Show appx. month pay / responsible sum, but based on the filtered df
        st.write(f'Appx. Mon. Pay / Responsible (Sum) = `${sum(bill_filtered_ov["Appx. Mon. Pay / Responsible"]*bill_filtered_ov['Frequency']):.2f}`')

        with bttn_col2:
            money_saved = f'{float(sum(bill_filtered_ov['Last Value'])-sum(bill_filtered_ov["Appx. Mon. Pay / Responsible"]*bill_filtered_ov['Frequency'])):.2f}'
            st.metric(label='Cost of Bills', value=sum(bill_filtered_ov['Last Value']), delta=money_saved)


        # don't display frequency in the table
        bill_filtered_ov_table = bill_filtered_ov.drop(columns=['Frequency'])
        
        st.table(bill_filtered_ov_table)

        

        st.markdown('---')
        
        # Concatenate the dataframes
        bill_history_df = pd.concat(bill_frames)
        # Correct order of dates
        bill_history_df = bill_history_df.sort_values(by='Date')

        # Draw a vertical line over each point, then display the date above the line

        # Plot the bill history
        matplotlib.pyplot.figure(figsize=(10, 8))
        matplotlib.pyplot.xlabel('Date')
        matplotlib.pyplot.ylabel('Cost ($)')
        matplotlib.pyplot.title('Bill History')
        matplotlib.pyplot.xticks(rotation=45)
        sns.lineplot(x='Date', y='Value', hue='Bill', data=bill_history_df)
        # put the legend beside the graph instead of on it
        matplotlib.pyplot.legend(bbox_to_anchor=(1.05, 1), loc='upper left', borderaxespad=0.)
        # Show the date on the x-axis
        matplotlib.pyplot.xticks(rotation=45)
        st.pyplot(matplotlib.pyplot.gcf())

        matplotlib.pyplot.close()

    with st.expander('Billing by Frequency', icon='💸️'):
        select_num_responsible = st.selectbox('Filter by # Responsible', [None, 1, 2])

        for frequency in frequencies.keys():

            st.markdown('---')
            
            bill_labels = []
            bill_last_values = []
            bill_appx_month = []
            bill_num_responsible = []

            if (select_num_responsible):
                for bill in [SHL for SHL in SharedBills if SHL.frequency == frequency and len(SHL.dues_chains) == select_num_responsible]:
                    if len(bill.payments_chain) >0:
                        bill_labels.append(bill.label)
                        last_hl = bill.payments_chain[-1]
                        bill_last_values.append(last_hl.data)
                        bill_appx_month.append(float(last_hl.data)/frequencies[frequency])
                        bill_num_responsible.append(len(bill.dues_chains))
            else:
                for bill in [SHL for SHL in SharedBills if SHL.frequency == frequency]:
                    if len(bill.payments_chain) >0:
                        bill_labels.append(bill.label)
                        last_hl = bill.payments_chain[-1]
                        bill_last_values.append(last_hl.data)
                        bill_appx_month.append(float(last_hl.data)/frequencies[frequency])
                        bill_num_responsible.append(len(bill.dues_chains))
                    else:
                        st.warning(f"Couldn't load {bill.label}")
            
            bill_last_sum = sum([float(f) for f in bill_last_values])
            st.write(f'### 💸️ {frequency} | `${bill_last_sum}` | `${bill_last_sum/frequencies[frequency]}`/month (total)')
            bill_month_ov = pd.DataFrame({
                'Bill': bill_labels,
                'Last Value': bill_last_values,
                'Appx. Monthly Cost': bill_appx_month,
                '# Responsible': bill_num_responsible
            })

            # sort the dataframe by last value (as float)
            bill_month_ov['Last Value'] = bill_month_ov['Last Value'].astype(float)
            bill_month_ov['Appx. Monthly Cost'] = bill_month_ov['Appx. Monthly Cost'].astype(float)

            bill_month_ov = bill_month_ov.sort_values(by='Last Value', ascending=False)
            st.table(bill_month_ov)
            
            # drop index

            bill_month_ov = bill_month_ov.reset_index(drop=True)

            # that didn't display the labels in the right order, fix

            matplotlib.pyplot.figure(figsize=(10, 5))
            matplotlib.pyplot.xlabel('Bill')
            matplotlib.pyplot.ylabel('Last Value ($)')
            matplotlib.pyplot.title(f'{frequency} Bills')
            matplotlib.pyplot.xticks(rotation=45)
            for i, bill in enumerate(bill_month_ov['Bill']):
                # display a red bar in the background showing the monthly value
                matplotlib.pyplot.bar(i, bill_month_ov['Appx. Monthly Cost'][i], color='#2f2f2f')
                matplotlib.pyplot.bar(i, bill_month_ov['Last Value'][i], color='lightblue')
                matplotlib.pyplot.text(i, bill_month_ov['Last Value'][i]/2, f"${bill_month_ov['Last Value'][i]:.2f}", ha='center', va='center')
                if frequency not in ['Monthly', 'Bi-monthly']:
                    matplotlib.pyplot.text(i, bill_month_ov['Appx. Monthly Cost'][i], f"${bill_month_ov['Appx. Monthly Cost'][i]:.2f}/month", ha='center', va='bottom')

            matplotlib.pyplot.xticks(ticks=range(len(bill_month_ov['Bill'])),labels=bill_month_ov['Bill'])

            st.pyplot(matplotlib.pyplot.gcf())

            matplotlib.pyplot.close()

            matplotlib.pyplot.figure(figsize=(10, 5))
            matplotlib.pyplot.xlabel('Bill')
            matplotlib.pyplot.ylabel('Appx. Value Per Responsible ($)')
            matplotlib.pyplot.title(f'{frequency} Bills by Responsibility')
            matplotlib.pyplot.xticks(rotation=45)
            for i, bill in enumerate(bill_month_ov['Bill']):
                matplotlib.pyplot.bar(i, bill_month_ov['Last Value'][i] / bill_month_ov['# Responsible'][i], color='lightblue')
                #matplotlib.pyplot.bar(i, bill_month_ov['Appx. Monthly Cost'][i], color='#2f2f2f')
                #matplotlib.pyplot.bar(i, bill_month_ov['Last Value'][i] / bill_num_responsible[i], color='lightblue')
                matplotlib.pyplot.text(i, (bill_month_ov['Last Value'][i] / bill_month_ov['# Responsible'][i]) / 2, f"${(bill_month_ov['Last Value'][i] / bill_month_ov['# Responsible'][i]):.2f} * {bill_month_ov['# Responsible'][i]}", ha='center', va='center')
                #if frequency not in ['Monthly', 'Bi-monthly']:
                #    matplotlib.pyplot.text(i, bill_month_ov['Appx. Monthly Cost'][i], f"${bill_month_ov['Appx. Monthly Cost'][i]:.2f}/month", ha='center', va='bottom')

            matplotlib.pyplot.xticks(ticks=range(len(bill_month_ov['Bill'])),labels=bill_month_ov['Bill'])

            st.pyplot(matplotlib.pyplot.gcf())

            matplotlib.pyplot.close()

        for payee in Payees.keys():
            
            st.write(f'## {payee}')

            #############################
            #   Graph Payment History   #
            #############################
            matplotlib.pyplot.figure(figsize=(10, 5))
            matplotlib.pyplot.xlabel('Month')
            matplotlib.pyplot.ylabel('Bill')
            matplotlib.pyplot.title('Payment History')
            matplotlib.pyplot.xticks(rotation=45)

            # Create a list of the last 6 months
            months = [datetime.now().replace(month=i).strftime('%b') for i in range(datetime.now().month, datetime.now().month - 6, -1)]

            # Create a list of bills
            bills = [bill.label for bill in SharedBills]

            # Create a 2D array to store the payment history
            payment_history = [[0 for _ in range(len(months))] for _ in range(len(bills))]

            # For each bill, check if there was a payment for a month in the past 6 months
            for i, bill in enumerate(SharedBills):
                bill.read_database()
                for position, payment_chain in bill.dues_chains.items():
                    if payee == get_payee_name_by_position(position):
                        dates = [datetime.fromtimestamp(HL.timestamp/1000) for HL in payment_chain if 'ok' in HL.data.lower()]
                        for date in dates:
                            if date.month in [i for i in range(datetime.now().month, datetime.now().month - 6, -1)]:
                                payment_history[i][months.index(date.strftime('%b'))] = 1

            # Plot the payment history
            matplotlib.pyplot.imshow(payment_history, cmap='Greys', aspect='auto')
            matplotlib.pyplot.yticks(range(len(bills)), bills)
            matplotlib.pyplot.xticks(range(len(months)), months)
            st.pyplot(matplotlib.pyplot.gcf())

            matplotlib.pyplot.close()

            ####################################################
            #    Create a table to show the payment history    #
            ####################################################
            payment_history_df = pd.DataFrame(payment_history, columns=months, index=bills)
            st.table(payment_history_df)

    with st.expander('Price History', icon='⌛'):

        for bill in SharedBills:
            #####################
            #   graph deltas    #
            #####################
            bill_name = bill.label
            bill_values = [hl.data for hl in bill.payments_chain if 'Genesis' not in hl.data]
            bill_history = [datetime.fromtimestamp(hl.timestamp/1000).strftime('%Y-%m-%d') for hl in bill.payments_chain if 'Genesis' not in hl.data]

            # Calculate a list of deltas; +/- from the last value
            bill_deltas = [0]
            for i in range(1, len(bill_values)):
                bill_deltas.append(float(bill_values[i]) - float(bill_values[i-1]))

            # Create a table to show the bill history
            st.write(f'## {bill_name} History')

            st.table(pd.DataFrame({
                'Issued': bill_history,
                'Cost': bill_values,
                'Delta': bill_deltas
            }))

            # Create a chart to show the bill deltas
            matplotlib.pyplot.figure(figsize=(10, 5))
            matplotlib.pyplot.xlabel('Date')
            matplotlib.pyplot.ylabel('Delta ($)')
            matplotlib.pyplot.title(f'{bill_name} Price Delta')
            matplotlib.pyplot.xticks(rotation=45)
            matplotlib.pyplot.plot(bill_history, bill_deltas)
            # display horizontal line from zero
            matplotlib.pyplot.axhline(y=0, color='gray', linestyle='--')
            # text overlay the value of the bill in that date
            for i in range(len(bill_history)):
                matplotlib.pyplot.text(bill_history[i], bill_deltas[i], bill_values[i], ha='center', va='bottom')
            st.pyplot(matplotlib.pyplot.gcf())

            matplotlib.pyplot.close()

            #########################
            #   Graph Deltas (2)    #
            #########################
            heatmap_data = pd.DataFrame({
                'Date': bill_history,
                'Delta': bill_deltas
            })

            # Setting Date as the index for a clean heatmap display
            heatmap_data['Date'] = pd.to_datetime(heatmap_data['Date'])
            heatmap_data = heatmap_data.set_index('Date')

            # Reshape the data if there are multiple bills over time (otherwise skip pivot)
            heatmap_data = heatmap_data.T  # Transpose to have dates as columns

            # Plot the heatmap
            matplotlib.pyplot.figure(figsize=(10, 2))  # Adjust height for better readability
            sns.heatmap(heatmap_data, annot=True, fmt=".1f", cmap="seismic", center=0, cbar_kws={'label': 'Delta ($)'})
            matplotlib.pyplot.title(f'{bill_name} Delta Changes Over Time')
            matplotlib.pyplot.xlabel('Date')
            matplotlib.pyplot.ylabel('Delta ($)')

            # Display heatmap in Streamlit
            st.pyplot(matplotlib.pyplot.gcf())

            matplotlib.pyplot.close()


conn.close()